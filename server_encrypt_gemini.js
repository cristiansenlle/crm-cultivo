const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const GEMINI_API_KEY = 'AIzaSyCrglBECK5uuTxh-Mlw7_z76AwrnUc4lac';
const N8N_ENCRYPTION_KEY = '7pc3rq8GI9OkNFWOHImXzk1hAGXhniQr';
const GEMINI_CRED_ID = 'gGemFlash2026001';

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' }).then(async () => {

    // Step 1: Find crypto-js in n8n's bundled modules on the server
    const findRes = await ssh.execCommand("find /usr/lib/node_modules/n8n -name 'index.js' -path '*crypto-js*' 2>/dev/null | head -5");
    console.log('crypto-js paths:', findRes.stdout);

    // Step 2: Run encryption on the server using n8n's own node and crypto-js
    const serverEncryptScript = `
const cryptoJsPath = '${findRes.stdout.trim().split('\n')[0] || "/usr/lib/node_modules/n8n/node_modules/crypto-js"}';
let CryptoJS;
try {
    CryptoJS = require(cryptoJsPath);
} catch(e) {
    // try alternate path
    CryptoJS = require('/usr/lib/node_modules/n8n/node_modules/crypto-js');
}
const key = '${N8N_ENCRYPTION_KEY}';
const data = JSON.stringify({ apiKey: '${GEMINI_API_KEY}' });
const encrypted = CryptoJS.AES.encrypt(data, key).toString();
process.stdout.write(encrypted);
`;
    
    await ssh.execCommand("cat > /tmp/server_encrypt.js << 'EOF'\n" + serverEncryptScript + "\nEOF");
    const encRes = await ssh.execCommand('node /tmp/server_encrypt.js');
    const encryptedData = encRes.stdout.trim();
    console.log('Server encrypted data (first 15):', encryptedData.substring(0, 15));
    console.log('Starts with U2F (CryptoJS format):', encryptedData.startsWith('U2F'));
    
    if (!encryptedData || encryptedData.length < 20) {
        console.error('Encryption failed:', encRes.stderr);
        ssh.dispose(); return;
    }
    
    // Step 3: Update SQLite with properly encrypted credential
    const pyScript = `
import sqlite3
from datetime import datetime
conn = sqlite3.connect('/root/.n8n/database.sqlite')
data = open('/tmp/gemini_enc.txt').read().strip()
now = datetime.now().strftime('%Y-%m-%d %H:%M:%S.000')
conn.execute("DELETE FROM credentials_entity WHERE id = ?", ['${GEMINI_CRED_ID}'])
conn.execute("""INSERT INTO credentials_entity (id, name, data, type, createdAt, updatedAt, isManaged, isGlobal, isResolvable, resolvableAllowFallback) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0)""",
    ['${GEMINI_CRED_ID}', 'Google Gemini (Free)', data, 'googleGeminiApi', now, now])
conn.commit()
print('Done, changes:', conn.total_changes)
conn.close()
`;
    // Write the encrypted data to a file to avoid shell escaping issues
    await ssh.execCommand(`echo '${encryptedData.replace(/'/g, "\\'")}' > /tmp/gemini_enc.txt`);
    await ssh.execCommand("cat > /tmp/update_gemini_cred.py << 'PYEOF'\n" + pyScript + "\nPYEOF");
    const pyRes = await ssh.execCommand('python3 /tmp/update_gemini_cred.py');
    console.log('DB update result:', pyRes.stdout, pyRes.stderr || '');
    
    // Step 4: Restart n8n
    await ssh.execCommand('pm2 restart n8n-service');
    console.log('n8n restarted.');
    
    // Step 5: Verify format matches existing credentials  
    const verifyGroq = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT substr(data,1,12) FROM credentials_entity WHERE type='groqApi';\"");
    const verifyGem = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT substr(data,1,12) FROM credentials_entity WHERE id='gGemFlash2026001';\"");
    console.log('\nGroq format match:', verifyGroq.stdout.trim());
    console.log('Gemini format match:', verifyGem.stdout.trim());
    console.log('Formats match:', verifyGroq.stdout.trim().substring(0,6) === verifyGem.stdout.trim().substring(0,6));
    
    ssh.dispose();
}).catch(e => console.error(e));
