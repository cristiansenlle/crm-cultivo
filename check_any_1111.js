const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkAny1111() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('--- Checking EVERY table for 11111111 ---');
    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite .dump | grep 11111111');
    console.log("Dump grep length:", res.stdout.length);
    console.log(res.stdout.substring(0, 500));

    ssh.dispose();
}

checkAny1111().catch(console.error);
