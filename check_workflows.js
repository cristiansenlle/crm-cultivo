const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });
    console.log('Active Workflows:');
    const res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, name, active FROM workflow_entity WHERE active = true;"');
    console.log(res.stdout);

    console.log('\nChecking LLM Node content in 9ASt18aP8tJss5mI...');
    const res2 = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id = \'9ASt18aP8tJss5mI\';"');

    if (res2.stdout.includes('LOTE-A01')) {
        console.log('WARNING: LOTE-A01 is STILL in the database nodes for workflow 9ASt18aP8tJss5mI');
    } else {
        console.log('SUCCESS: LOTE-A01 is NOT in the database nodes for workflow 9ASt18aP8tJss5mI');
    }

    // Is there a different workflow that the webhook points to?
    const resWebhook = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT workflowId, path FROM webhook_entity;"');
    console.log('\nWebhooks:');
    console.log(resWebhook.stdout);

    ssh.dispose();
}
check().catch(console.error);
