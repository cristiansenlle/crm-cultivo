const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function grepServer() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('--- Grepping /root/.n8n ---');
    let res = await ssh.execCommand('grep -rnw "/root/" -e "11111111" --exclude-dir=node_modules');
    console.log(res.stdout);

    ssh.dispose();
}

grepServer().catch(console.error);
