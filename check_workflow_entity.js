const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkExe() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('--- Checking workflow_entity ---');
    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite ".dump workflow_entity" | grep -a "11111111" | wc -l');
    console.log("Matches:", res.stdout);

    ssh.dispose();
}

checkExe().catch(console.error);
