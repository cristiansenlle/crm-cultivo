const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function auditOwnersFixed() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'HIDDEN_SECRET_BY_AI' 
        });

        const dbs = [
            '/root/.n8n/database.sqlite',
            '/root/.n8n/.n8n/database.sqlite'
        ];

        for (const db of dbs) {
            console.log(`\n--- Auditing Database: ${db} ---`);
            
            // Check users
            const usersRes = await ssh.execCommand(`sqlite3 ${db} "SELECT id, email FROM user;"`);
            console.log('Users:\n', usersRes.stdout || 'No users found');

            // Check workflow owner
            const targetId = 'scpZdPe5Cp4MG98G';
            const wfRes = await ssh.execCommand(`sqlite3 ${db} "SELECT id, name, userId FROM workflow_entity WHERE id = '${targetId}';"`);
            console.log('Target Workflow Owner:\n', wfRes.stdout || `Workflow ${targetId} not found in this DB`);
        }

        ssh.dispose();
    } catch (err) {
        console.error('Audit failed:', err.message);
    }
}

auditOwnersFixed();
