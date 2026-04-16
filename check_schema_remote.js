const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkSchema() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'HIDDEN_SECRET_BY_AI' 
        });

        const db = '/root/.n8n/database.sqlite';
        const res = await ssh.execCommand(`sqlite3 ${db} "PRAGMA table_info(workflow_history);"`);
        console.log('Workflow History:', res.stdout);
        ssh.dispose();
    } catch (err) {
        console.error('Schema check failed:', err.message);
    }
}

checkSchema();
