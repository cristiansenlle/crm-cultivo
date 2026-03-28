const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function traceExe() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('Fetching most recent execution_data entry containing 1111...');
    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT executionData FROM execution_entity WHERE executionData LIKE \'%111111%\' ORDER BY id DESC LIMIT 1;"');

    fs.writeFileSync('execution_trace.json', res.stdout);
    console.log('Saved to execution_trace.json. Length:', res.stdout.length);

    ssh.dispose();
}

traceExe().catch(console.error);
