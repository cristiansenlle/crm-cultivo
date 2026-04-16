const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    let res = await ssh.execCommand('grep 11111111 /root/export2.json');
    console.log("Output from grep:", res.stdout.substring(0, 100));

    ssh.dispose();
}

run().catch(console.error);
