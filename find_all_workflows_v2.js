const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function findAllWorkflows() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod' 
        });

        const dbs = [
            '/root/.n8n/database.sqlite',
            '/root/.n8n/.n8n/database.sqlite'
        ];

        for (const db of dbs) {
            console.log(`\n--- DB: ${db} ---`);
            const exists = await ssh.execCommand(`ls ${db}`);
            if (exists.stdout.includes('No such file')) continue;

            const res = await ssh.execCommand(`sqlite3 ${db} "SELECT id, name, active, userId FROM workflow_entity;"`);
            console.log(res.stdout || 'No workflows found');
            
            console.log('--- Users ---');
            const userRes = await ssh.execCommand(`sqlite3 ${db} "SELECT id, email FROM user;"`);
            console.log(userRes.stdout || 'No users found');
        }

        ssh.dispose();
    } catch (err) {
        console.error('Find failed:', err.message);
    }
}

findAllWorkflows();
