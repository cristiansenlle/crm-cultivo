const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function listTables() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod' 
        });

        const db = '/root/.n8n/database.sqlite';
        const res = await ssh.execCommand(`sqlite3 ${db} ".tables"`);
        console.log('Tables:', res.stdout);
        ssh.dispose();
    } catch (err) {
        console.error('List tables failed:', err.message);
    }
}

listTables();
