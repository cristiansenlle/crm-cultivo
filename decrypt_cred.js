// Decrypt n8n credential and use it to create core_rooms table via pg
const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function createTable() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    // Decrypt the credential using n8n's own crypto approach (AES-256-CBC via CryptoJS openssl format)
    const decryptScript = `
const CryptoJS = require('/usr/lib/node_modules/pm2/node_modules/crypto-js');
const encryptedData = 'U2FsdGVkX1/hk9BhLgpJWu4ohjBLbJZLuCi0ffPK7/IvqoQwUAyCFhxO2CdnKzVuRSAiP5tft4xBT2irYnRdhXpkg/diAH5WPn/z+8sdMIJMrs9d07ExxpOVmR5jcEsQ+trqftfA5YbIsnNA77XE5hz/NSAlBNp+8lAfddWguiugYpJy7um4ocKlfuaItl3vJc9T4+WsKMkx44w/U+F0UanCqybmy6h01D9pWpGFapc=';
const key = '7pc3rq8GI9OkNFWOHImXzk1hAGXhniQr';
try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key).toString(CryptoJS.enc.Utf8);
    console.log('DECRYPTED:', decrypted);
} catch(e) { console.log('Decrypt error:', e.message); }
`;
    // Write and execute the decrypt script
    const fs = require('fs');
    fs.writeFileSync('/tmp/decrypt_cred.js', decryptScript);
    await ssh.putFile('/tmp/decrypt_cred.js', '/root/decrypt_cred.js');
    const result = await ssh.execCommand('node /root/decrypt_cred.js 2>&1');
    console.log('Decrypt result:', result.stdout.substring(0, 1000));
    console.log('Decrypt error:', result.stderr.substring(0, 500));

    ssh.dispose();
}

createTable().catch(console.error);
