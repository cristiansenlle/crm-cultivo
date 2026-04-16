const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function getCreds() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, name, type FROM credentials_entity;"');
        console.log(res.stdout);
        ssh.dispose();
    } catch (e) {
        console.error(e);
        ssh.dispose();
    }
}
getCreds();
