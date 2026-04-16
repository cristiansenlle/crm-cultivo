const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

async function run() {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
        await ssh.getFile('bot-wa-local.js', '/opt/crm-cannabis/bot-wa.js');
        console.log("Downloaded bot-wa.js from VPS");
        ssh.dispose();
    } catch(e) { console.error(e); }
}
run();
