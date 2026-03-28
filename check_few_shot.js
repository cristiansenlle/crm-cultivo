const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkFewShot() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('--- Checking for 9cdkm5dqb in sqlite ---');
    let res = await ssh.execCommand('grep -a "9cdkm5dqb" /root/.n8n/database.sqlite');
    console.log(res.stdout.substring(0, 500));

    ssh.dispose();
}

checkFewShot().catch(console.error);
