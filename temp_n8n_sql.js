const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log("Checking DB credentials IDs:");
    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, name FROM credentials_entity;"');
    console.log(res.stdout);
    
    ssh.dispose();
}
run().catch(console.error);
