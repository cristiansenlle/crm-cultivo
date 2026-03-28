const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkIds() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('Workflows with 11111111:');
    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, name FROM workflow_entity WHERE nodes LIKE \'%11111111%\';"');
    console.log(res.stdout);

    console.log('Workflows with Sour Diesel:');
    let res2 = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, name FROM workflow_entity WHERE nodes LIKE \'%Sour Diesel%\';"');
    console.log(res2.stdout);

    ssh.dispose();
}

checkIds().catch(console.error);
