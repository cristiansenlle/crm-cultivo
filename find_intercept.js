const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function findIntercept() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('--- Searching for CRITICAL INTERCEPT in n8n core ---');
    let res = await ssh.execCommand('grep -rnw "/usr/lib/node_modules/n8n/" -e "CRITICAL INTERCEPT"');
    console.log(res.stdout);

    ssh.dispose();
}

findIntercept().catch(console.error);
