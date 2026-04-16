const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function clearMemory() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('--- Wiping chat_hub_messages and chat_hub_sessions ---');
    let res1 = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "DELETE FROM chat_hub_messages;"');
    console.log('chat_hub_messages:', res1.stdout, res1.stderr);

    let res2 = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "DELETE FROM chat_hub_sessions;"');
    console.log('chat_hub_sessions:', res2.stdout, res2.stderr);

    ssh.dispose();
}

clearMemory().catch(console.error);
