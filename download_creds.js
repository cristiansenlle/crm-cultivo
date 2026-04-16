const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function getCreds() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    await ssh.getFile('creds_backup.json', '/root/creds_backup.json');
    console.log('Downloaded creds_backup.json');
    ssh.dispose();
}

getCreds().catch(console.error);
