const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function run() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        const res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT connections FROM workflow_entity WHERE id=\'scpZdPe5Cp4MG98G\';"');
        fs.writeFileSync('live_connections.json', res.stdout);
        console.log('Saved connections to live_connections.json');
        ssh.dispose();
    } catch(e) {
        console.error(e);
        ssh.dispose();
    }
}
run();
