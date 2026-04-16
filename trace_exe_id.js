const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function traceExeId() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('--- Checking execution_entity ---');
    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, workflowId FROM execution_entity ORDER BY id DESC LIMIT 5;"');
    console.log(res.stdout);

    ssh.dispose();
}

traceExeId().catch(console.error);
