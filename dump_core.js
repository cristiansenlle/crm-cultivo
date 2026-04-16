const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkFile() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    let res = await ssh.execCommand('sed -n "70,100p" /usr/lib/node_modules/n8n/node_modules/n8n-core/dist/execution-engine/node-execution-context/node-execution-context.js');
    console.log(res.stdout);

    ssh.dispose();
}

checkFile().catch(console.error);
