const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function restartBot() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('--- Restarting WhatsApp Bot ---');
    let res = await ssh.execCommand('pm2 restart whatsapp-bot');
    console.log(res.stdout);

    console.log('--- Checking logs after restart ---');
    await new Promise(resolve => setTimeout(resolve, 5000));
    let res2 = await ssh.execCommand('pm2 logs whatsapp-bot --lines 20 --nostream');
    console.log(res2.stdout);

    ssh.dispose();
}

restartBot().catch(console.error);
