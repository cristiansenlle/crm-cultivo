const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkFewShot() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('--- Checking for 9cdkm5dqb in sqlite ---');
    let res = await ssh.execCommand('grep -a "9cdkm5dqb" /root/.n8n/database.sqlite');
    console.log(res.stdout.substring(0, 500));

    ssh.dispose();
}

checkFewShot().catch(console.error);
