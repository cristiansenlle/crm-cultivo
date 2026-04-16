const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkSchema() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('--- Checking Schema of execution_data ---');
    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "PRAGMA table_info(execution_data);"');
    console.log(res.stdout);

    console.log('--- Fetching truly latest executionId ---');
    let res2 = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT executionId FROM execution_data ORDER BY CAST(executionId AS INTEGER) DESC LIMIT 5;"');
    console.log(res2.stdout);

    ssh.dispose();
}

checkSchema().catch(console.error);
