const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const NEW_GEMINI_API_KEY = 'AIzaSyALug3f0It5jUx2Rs2GXaeErkiG8TWJy_o';
const N8N_ENCRYPTION_KEY = '7pc3rq8GI9OkNFWOHImXzk1hAGXhniQr';
const GEMINI_CRED_ID = 'gGemFlash2026001';

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' }).then(async () => {

    // Encrypt the new API key on the server using n8n's own CryptoJS
    const serverScript = `
const CryptoJS = require('/usr/lib/node_modules/n8n/node_modules/crypto-js');
const encrypted = CryptoJS.AES.encrypt(JSON.stringify({ apiKey: '${NEW_GEMINI_API_KEY}' }), '${N8N_ENCRYPTION_KEY}').toString();
process.stdout.write(encrypted);
`;
    await ssh.execCommand(`cat > /tmp/enc_new_gemini.js << 'EOF'\n${serverScript}\nEOF`);
    const encRes = await ssh.execCommand('node /tmp/enc_new_gemini.js');
    const encryptedData = encRes.stdout.trim();
    
    console.log('Encrypted OK:', encryptedData.startsWith('U2F'), '| First 15:', encryptedData.substring(0, 15));

    // Save to file and update SQLite
    await ssh.execCommand(`echo '${encryptedData}' > /tmp/new_gem_key.txt`);
    
    const py = `
import sqlite3
from datetime import datetime
conn = sqlite3.connect('/root/.n8n/database.sqlite')
data = open('/tmp/new_gem_key.txt').read().strip()
now = datetime.now().strftime('%Y-%m-%d %H:%M:%S.000')
conn.execute("DELETE FROM credentials_entity WHERE id=?", ['${GEMINI_CRED_ID}'])
conn.execute("""INSERT INTO credentials_entity (id,name,data,type,createdAt,updatedAt,isManaged,isGlobal,isResolvable,resolvableAllowFallback)
    VALUES (?,?,?,?,?,?,0,0,0,0)""",
    ['${GEMINI_CRED_ID}','Google Gemini (Free)',data,'googleGeminiApi',now,now])
conn.commit()
print('Updated', conn.total_changes, 'rows')
conn.close()
`;
    await ssh.execCommand(`cat > /tmp/upd_gem.py << 'PYEOF'\n${py}\nPYEOF`);
    const pyRes = await ssh.execCommand('python3 /tmp/upd_gem.py');
    console.log('DB:', pyRes.stdout.trim());

    // Restart n8n
    await ssh.execCommand('pm2 restart n8n-service');
    console.log('n8n restarted ✓');

    ssh.dispose();
}).catch(e => console.error(e));
