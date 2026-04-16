const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function auditDatabases() {
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
            const exists = await ssh.execCommand(`ls ${db}`);
            if (exists.stdout.includes('No such file')) {
                console.log('File does not exist.');
                continue;
            }

            console.log('Users:');
            const users = await ssh.execCommand(`sqlite3 -json ${db} "SELECT id, email, role FROM \\"user\\";"`);
            console.log(users.stdout);

            console.log('Workflows & Owners:');
            const workflows = await ssh.execCommand(`sqlite3 -json ${db} "SELECT id, name, active, userId FROM workflow_entity;"`);
            console.log(workflows.stdout);
        }

        ssh.dispose();
    } catch (err) {
        console.error('Audit failed:', err.message);
    }
}

auditDatabases();
