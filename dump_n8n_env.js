const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkEnv() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('--- Finding n8n PM2 Process ENV ---');
    let res = await ssh.execCommand('pm2 env 3');
    console.log(res.stdout);

    ssh.dispose();
}

checkEnv().catch(console.error);
