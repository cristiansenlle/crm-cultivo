const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkTables() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite ".tables"');
    console.log(res.stdout);

    ssh.dispose();
}

checkTables().catch(console.error);
