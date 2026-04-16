const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkWeb() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('--- Checking webhook_entity ---');
    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT webhookPath, workflowId, node FROM webhook_entity;"');
    console.log(res.stdout);

    ssh.dispose();
}

checkWeb().catch(console.error);
