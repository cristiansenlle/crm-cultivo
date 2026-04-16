const fs = require('fs');
const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkExeId() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    // Find the execution entity metadata that matches our 1111 data
    console.log('--- Finding Workflow ID from Execution ---');
    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT workflowId, id FROM execution_entity ORDER BY id DESC LIMIT 5;"');
    console.log(res.stdout);

    ssh.dispose();
}

checkExeId().catch(console.error);
