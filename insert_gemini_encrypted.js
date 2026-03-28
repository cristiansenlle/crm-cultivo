// n8n encrypts credentials using AES-256 with the encryptionKey from config
// The format is: JSON string encrypted with AES-256-CBC, stored as a JSON string with {iv, content}
const { NodeSSH } = require('node-ssh');
const crypto = require('crypto');

const GEMINI_API_KEY = 'AIzaSyCrglBECK5uuTxh-Mlw7_z76AwrnUc4lac';
const N8N_ENCRYPTION_KEY = '7pc3rq8GI9OkNFWOHImXzk1hAGXhniQr';
const GEMINI_CRED_ID = 'gGemFlash2026001';

function encryptCredential(data, encryptionKey) {
    // n8n uses a 32-byte key derived from the encryption key
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return JSON.stringify({ iv: iv.toString('hex'), content: encrypted });
}

const ssh = new NodeSSH();
ssh.connect({
    host: '109.199.99.126',
    username: 'root',
    password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
}).then(async () => {

    // Encrypt the credential data
    const credData = encryptCredential({ apiKey: GEMINI_API_KEY }, N8N_ENCRYPTION_KEY);
    console.log('Encrypted credential (first 60 chars):', credData.substring(0, 60));

    // Write Python script with escaped data
    const escapedData = credData.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    
    const pyScript = `
import sqlite3
from datetime import datetime

conn = sqlite3.connect('/root/.n8n/database.sqlite')
cred_id = '${GEMINI_CRED_ID}'
name = 'Google Gemini (Free)'
cred_type = 'googleGeminiApi'
data = '${escapedData}'
now = datetime.now().strftime('%Y-%m-%d %H:%M:%S.000')

conn.execute("""
    DELETE FROM credentials_entity WHERE id = ?
""", [cred_id])
conn.execute("""
    INSERT INTO credentials_entity (id, name, data, type, createdAt, updatedAt, isManaged, isGlobal, isResolvable, resolvableAllowFallback)
    VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0)
""", [cred_id, name, data, cred_type, now, now])
conn.commit()
print('Encrypted credential upserted, rows:', conn.total_changes)
conn.close()
`;

    const fs = require('fs');
    fs.writeFileSync('/tmp/insert_encrypted_cred.py', pyScript);
    await ssh.putFile('/tmp/insert_encrypted_cred.py', '/tmp/insert_encrypted_cred.py');
    const pyRes = await ssh.execCommand('python3 /tmp/insert_encrypted_cred.py');
    console.log('Result:', pyRes.stdout, pyRes.stderr || '');

    // Restart n8n cleanly
    const restart = await ssh.execCommand('pm2 restart n8n-service');
    console.log('n8n restarted:', restart.stdout?.substring(0, 80));

    // Wait 5s and check logs
    await new Promise(r => setTimeout(r, 5000));
    const logs = await ssh.execCommand('pm2 logs n8n-service --lines 10 --nostream');
    console.log('\n=== n8n logs after restart ===');
    console.log(logs.stdout);

    ssh.dispose();
}).catch(e => console.error(e));
