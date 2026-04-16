const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkPm2Show() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('--- pm2 show n8n-service ---');
    let res = await ssh.execCommand('pm2 show n8n-service');
    console.log(res.stdout);

    ssh.dispose();
}

checkPm2Show().catch(console.error);
