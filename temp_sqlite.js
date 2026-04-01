const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, name FROM workflow_entity ORDER BY \\"createdAt\\" DESC LIMIT 1;"');
    console.log(res.stdout);
    ssh.dispose();
}
run().catch(console.error);
