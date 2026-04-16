const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkTables() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite ".tables"');
    console.log(res.stdout);

    ssh.dispose();
}

checkTables().catch(console.error);
