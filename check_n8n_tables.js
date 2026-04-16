const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkExe() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('Listing all tables in N8N database...');
    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite ".tables"');
    console.log(res.stdout);

    console.log('\nChecking chat_message_entity or memory...');
    let res2 = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT * FROM chat_message;"');
    if (res2.stderr) {
        console.log(res2.stderr);
    } else {
        console.log(res2.stdout.substring(0, 1000));
    }

    ssh.dispose();
}

checkExe().catch(console.error);
