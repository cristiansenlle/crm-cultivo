const { NodeSSH } = require('node-ssh');
const fs = require('fs');

const ssh = new NodeSSH();

async function deploy() {
    console.log('Connecting to VPS...');
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('Uploading bot_agronomy_server.js...');
    const localFile = 'bot_agronomy_server.js';
    const remoteDest = '/opt/crm-cannabis/bot_agronomy_server.js';
    
    await ssh.putFile(localFile, remoteDest);

    console.log('Restarting PM2 Service...');
    await ssh.execCommand('cd /opt/crm-cannabis && pm2 stop bot_agronomy_server || true');
    await ssh.execCommand('cd /opt/crm-cannabis && pm2 delete bot_agronomy_server || true');
    
    // Start daemon
    const startResult = await ssh.execCommand('cd /opt/crm-cannabis && pm2 start bot_agronomy_server.js --name "bot_agronomy_server"');
    console.log('PM2 Start:', startResult.stdout);
    
    await ssh.execCommand('pm2 save');

    console.log('Webhook Deploy Complete!');
    ssh.dispose();
}

deploy().catch(e => console.error(e));
