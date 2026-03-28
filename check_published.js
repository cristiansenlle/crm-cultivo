const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkPublished() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('--- Schema of workflow_entity ---');
    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "PRAGMA table_info(workflow_entity);"');
    console.log(res.stdout);

    console.log('--- Are there published columns? ---');
    let res2 = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, active FROM workflow_entity WHERE id = \'scpZdPe5Cp4MG98G\';"');
    console.log(res2.stdout);

    console.log('--- Checking shared_workflow ---');
    let res3 = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "PRAGMA table_info(shared_workflow);"');
    console.log(res3.stdout);

    ssh.dispose();
}

checkPublished().catch(console.error);
