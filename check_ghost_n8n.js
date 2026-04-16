const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkAll() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('Searching all workflows for dvvfdsaqvcyftaaronhd or 11111111...');
    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, name FROM workflow_entity WHERE nodes LIKE \'%dvvfdsa%\' OR nodes LIKE \'%11111111%\';"');
    console.log('Workflows with old strings in JSON:\n', res.stdout);

    console.log('\nSearching ALL webhooks for wa-inbound...');
    let res2 = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT * FROM webhook_entity WHERE path=\'wa-inbound\';"');
    console.log('Webhooks handling wa-inbound:\n', res2.stdout);

    ssh.dispose();
}

checkAll().catch(console.error);
