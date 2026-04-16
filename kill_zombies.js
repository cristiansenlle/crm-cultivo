const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function killZombie() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('--- Checking all n8n instances ---');
    let res = await ssh.execCommand('ps aux | grep n8n');
    console.log(res.stdout);

    console.log('--- Killing all n8n processes ---');
    await ssh.execCommand('pkill -f n8n');

    console.log('--- Restarting PM2 carefully ---');
    let res2 = await ssh.execCommand('pm2 restart n8n-service');
    console.log(res2.stdout);

    console.log('--- Verify exactly ONE process running now ---');
    let res3 = await ssh.execCommand('ps aux | grep n8n');
    console.log(res3.stdout);

    ssh.dispose();
}

killZombie().catch(console.error);
