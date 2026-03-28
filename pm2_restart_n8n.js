const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function restartPM2() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('--- Restarting n8n-service natively ---');
    let res = await ssh.execCommand('pm2 restart n8n-service');
    console.log(res.stdout);

    ssh.dispose();
}

restartPM2().catch(console.error);
