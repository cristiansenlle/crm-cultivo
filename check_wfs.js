const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log("Checking workflows:");
        let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, name, active FROM workflow_entity;"');
        console.log(res.stdout);

        ssh.dispose();
    } catch (e) {
        console.error("Error:", e);
        ssh.dispose();
    }
}

check();
