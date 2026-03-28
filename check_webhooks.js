const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkWebhooks() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('--- Checking webhook_entity ---');
    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT webhookPath, workflowId, method, node FROM webhook_entity WHERE webhookPath LIKE \'%wa-inbound%\';"');
    console.log(res.stdout);

    ssh.dispose();
}

checkWebhooks().catch(console.error);
