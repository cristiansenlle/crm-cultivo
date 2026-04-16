const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

async function uploadBot() {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
    await ssh.putFile('remote_bot_agronomy_server.js', '/opt/crm-cannabis/bot_agronomy_server.js');
    console.log('Uploaded bot_agronomy_server.js');
    await ssh.execCommand('pm2 restart bot_agronomy_server');
    console.log('Restarted bot!');
    ssh.dispose();
}

uploadBot();
