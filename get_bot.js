const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

async function getBot() {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
    await ssh.getFile('tmp_bot_agronomy_server.js', '/opt/crm-cannabis/bot_agronomy_server.js');
    console.log('Downloaded bot_agronomy_server.js');
    ssh.dispose();
}

getBot();
