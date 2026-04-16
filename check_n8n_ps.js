const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkDocker() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('--- docker ps ---');
    let res = await ssh.execCommand('docker ps');
    console.log(res.stdout);

    console.log('\n--- docker-compose logs ---');
    let res2 = await ssh.execCommand('cd /root/n8n-docker && docker-compose ps');
    console.log(res2.stdout);

    ssh.dispose();
}

checkDocker().catch(console.error);
