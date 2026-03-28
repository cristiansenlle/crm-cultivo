const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkExecutions() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod' 
        });

        const db = '/root/.n8n/database.sqlite';
        const res = await ssh.execCommand(`sqlite3 -json ${db} "SELECT id, workflowId, status, startedAt FROM execution_entity WHERE workflowId = 'scpZdPe5Cp4MG98G' ORDER BY startedAt DESC LIMIT 5"`);
        console.log('Executions:', res.stdout);
        ssh.dispose();
    } catch (err) {
        console.error('Check executions failed:', err.message);
    }
}

checkExecutions();
