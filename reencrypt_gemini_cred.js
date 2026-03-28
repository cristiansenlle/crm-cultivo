// n8n uses CryptoJS (not Node's native crypto) to encrypt credentials
// The format is: CryptoJS.AES.encrypt(JSON.stringify(data), encryptionKey).toString()
// This produces a Base64 string starting with "U2FsdGVkX1" (Salted__ prefix)

const { NodeSSH } = require('node-ssh');
const CryptoJS = require('crypto-js');
const ssh = new NodeSSH();

const GEMINI_API_KEY = 'AIzaSyCrglBECK5uuTxh-Mlw7_z76AwrnUc4lac';
const N8N_ENCRYPTION_KEY = '7pc3rq8GI9OkNFWOHImXzk1hAGXhniQr';
const GEMINI_CRED_ID = 'gGemFlash2026001';

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' }).then(async () => {
    // Check if crypto-js is available on the server
    const check = await ssh.execCommand('node -e "require(\'crypto-js\')"');
    console.log('crypto-js check:', check.stdout, check.stderr?.substring(0, 100));
    
    // Instead — use the server's own node to encrypt (same environment as n8n)
    const encryptScript = `
const CryptoJS = require('/usr/lib/node_modules/n8n/node_modules/crypto-js');
const key = '${N8N_ENCRYPTION_KEY}';
const data = JSON.stringify({ apiKey: '${GEMINI_API_KEY}' });
const encrypted = CryptoJS.AES.encrypt(data, key).toString();
process.stdout.write(encrypted);
`;
    
    await ssh.execCommand(`cat > /tmp/encrypt_gemini.js << 'NODEOF'
${encryptScript}
NODEOF`);
    
    const encResult = await ssh.execCommand('node /tmp/encrypt_gemini.js');
    const encryptedData = encResult.stdout.trim();
    console.log('Encrypted (CryptoJS):', encryptedData.substring(0, 60));
    
    if (!encryptedData.startsWith('U2F')) {
        console.error('Encryption format wrong — trying alternate path');
        const altRes = await ssh.execCommand('find /usr/lib/node_modules/n8n -name "aes.js" -path "*crypto-js*" 2>/dev/null | head -3');
        console.log('CryptoJS paths:', altRes.stdout);
        ssh.dispose(); return;
    }
    
    // Now update the credential with properly encoded data
    const fs = require('fs');
    const pyScript = `
import sqlite3
from datetime import datetime

conn = sqlite3.connect('/root/.n8n/database.sqlite')
cred_id = '${GEMINI_CRED_ID}'
name = 'Google Gemini (Free)'
cred_type = 'googleGeminiApi'
data = """${encryptedData}"""
now = datetime.now().strftime('%Y-%m-%d %H:%M:%S.000')

conn.execute("DELETE FROM credentials_entity WHERE id = ?", [cred_id])
conn.execute("""
    INSERT INTO credentials_entity (id, name, data, type, createdAt, updatedAt, isManaged, isGlobal, isResolvable, resolvableAllowFallback)
    VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0)
""", [cred_id, name, data, cred_type, now, now])
conn.commit()
print('Upserted with CryptoJS format, rows:', conn.total_changes)
conn.close()
`;
    fs.writeFileSync('/tmp/reinsert_gemini.py', pyScript);
    await ssh.putFile('/tmp/reinsert_gemini.py', '/tmp/reinsert_gemini.py');
    const pyRes = await ssh.execCommand('python3 /tmp/reinsert_gemini.py');
    console.log('Python result:', pyRes.stdout, pyRes.stderr || '');
    
    // Verify format matches existing
    const verifyFmt = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT substr(data,1,12) FROM credentials_entity WHERE id='gGemFlash2026001';\"");
    console.log('\nGemini cred first 12 chars:', verifyFmt.stdout.trim());
    
    // Restart n8n to pick up the updated credential
    await ssh.execCommand('pm2 restart n8n-service');
    console.log('n8n restarted.');
    
    ssh.dispose();
}).catch(e => console.error(e));
