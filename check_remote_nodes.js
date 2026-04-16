const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkRemoteN8n() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('Checking installed n8n community nodes...');
    let res = await ssh.execCommand('cat /root/.n8n/package.json');
    console.log("n8n package.json:", res.stdout);

    console.log('Checking ~/.n8n/custom directory...');
    let res2 = await ssh.execCommand('ls -la /root/.n8n/custom');
    console.log("custom dir:", res2.stdout);

    console.log('Checking n8n active config...');
    let res3 = await ssh.execCommand('cat /root/.n8n/.env');
    console.log("env:", res3.stdout);
    
    ssh.dispose();
}

checkRemoteN8n().catch(console.error);
