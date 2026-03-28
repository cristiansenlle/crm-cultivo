const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkRemoteN8nEnvs() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('Checking dockerps...');
    let res = await ssh.execCommand('docker ps -a');
    console.log("docker ps:", res.stdout);

    console.log('Checking npm global modules...');
    let res2 = await ssh.execCommand('npm list -g --depth=0');
    console.log("npm globals:", res2.stdout);

    console.log('Checking pm2 status...');
    let res3 = await ssh.execCommand('pm2 status');
    console.log("pm2 status:", res3.stdout);
    
    ssh.dispose();
}

checkRemoteN8nEnvs().catch(console.error);
