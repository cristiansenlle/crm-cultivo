const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function getWehooks() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        const res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT webhookPath, method, workflowId FROM webhook_entity;"');
        console.log(res.stdout);
        ssh.dispose();
    } catch(e) {
        console.error(e);
        ssh.dispose();
    }
}
getWehooks();
