const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function findCredentials() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod' 
        });

        const db = '/root/.n8n/database.sqlite';
        const res = await ssh.execCommand(`sqlite3 -json ${db} "SELECT id, name, type FROM credentials_entity;"`);
        const creds = JSON.parse(res.stdout);
        console.log('All Credentials:', JSON.stringify(creds, null, 2));
        ssh.dispose();
    } catch (err) {
        console.error('Find credentials failed:', err.message);
    }
}

findCredentials();
