const { NodeSSH } = require('node-ssh');
const fs = require('fs');

async function downloadMainJs() {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });
        console.log('Fetching /opt/crm-cannabis/main.js...');
        await ssh.getFile('c:\\Users\\Cristian\\.gemini\\antigravity\\crm cannabis\\remote_main.js', '/opt/crm-cannabis/main.js');
        console.log('Downloaded main.js');
        ssh.dispose();
    } catch (err) {
        console.error(err);
    }
}

downloadMainJs();
