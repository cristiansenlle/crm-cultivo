const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function clearExecutions() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('--- Wiping N8N execution trace history ---');
    let res1 = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "DELETE FROM execution_data;"');
    console.log('execution_data deleted:', res1.stdout, res1.stderr);

    let res2 = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "DELETE FROM execution_entity;"');
    console.log('execution_entity deleted:', res2.stdout, res2.stderr);

    ssh.dispose();
}

clearExecutions().catch(console.error);
