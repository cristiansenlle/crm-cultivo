const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkWxBot() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('Checking pm2 whatsapp-bot info...');
    let res = await ssh.execCommand('pm2 info whatsapp-bot');
    console.log("bot info:", res.stdout);

    ssh.dispose();
}

checkWxBot().catch(console.error);
