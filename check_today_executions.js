const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkToday() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'HIDDEN_SECRET_BY_AI' 
        });

        const date = '2026-03-16';
        console.log(`--- Checking Executions for ${date} ---`);
        const res = await ssh.execCommand(`sqlite3 -json /root/.n8n/database.sqlite "SELECT id, workflowId, status, startedAt FROM execution_entity WHERE startedAt >= '${date} 00:00:00' ORDER BY startedAt DESC LIMIT 100;"`);
        
        console.log(res.stdout || 'No executions found today.');

        ssh.dispose();
    } catch (err) {
        console.error('Check failed:', err.message);
    }
}

checkToday();
