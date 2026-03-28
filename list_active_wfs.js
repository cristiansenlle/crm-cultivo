const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function listWfs() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log("Listing workflows...");
    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, name, active FROM workflow_entity;"');
    console.log(res.stdout);
    ssh.dispose();
}

listWfs().catch(console.error);
