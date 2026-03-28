const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkN8nLogs() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('--- Checking recent n8n-service error Logs ---');
    let res = await ssh.execCommand('pm2 logs n8n-service --lines 50 --nostream');
    console.log(res.stdout);

    ssh.dispose();
}

checkN8nLogs().catch(console.error);
