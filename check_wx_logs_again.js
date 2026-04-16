const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkWxLogs() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('--- Checking recent WhatsApp PM2 Logs ---');
    let res = await ssh.execCommand('pm2 logs whatsapp-bot --lines 50 --nostream');
    console.log(res.stdout);

    ssh.dispose();
}

checkWxLogs().catch(console.error);
