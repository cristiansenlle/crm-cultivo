const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkMemory() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('Checking chat_hub_messages for LOTE-A01...');
    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT * FROM chat_hub_messages WHERE text LIKE \'%LOTE%\' LIMIT 10;"');
    console.log(res.stdout);

    console.log('Wiping chat_hub_messages and chat_hub_sessions...');
    await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "DELETE FROM chat_hub_messages;"');
    await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "DELETE FROM chat_hub_sessions;"');
    console.log('Memory wiped!');

    ssh.dispose();
}

checkMemory().catch(console.error);
