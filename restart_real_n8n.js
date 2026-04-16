const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function restartN8N() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('--- Checking pm2 ---');
    let res = await ssh.execCommand('pm2 list');
    console.log(res.stdout);

    console.log('--- Checking systemctl ---');
    let res2 = await ssh.execCommand('systemctl status n8n');
    console.log(res2.stdout);

    ssh.dispose();
}

restartN8N().catch(console.error);
