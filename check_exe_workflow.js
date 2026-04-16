const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkExeData() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT workflowData FROM execution_entity WHERE id = 51"');
    console.log(res.stdout.includes('11111111'));

    ssh.dispose();
}

checkExeData().catch(console.error);
