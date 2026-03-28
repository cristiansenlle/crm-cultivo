const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function getRecent() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod' 
        });

        console.log('--- Fetching 20 Recent Executions ---');
        const res = await ssh.execCommand('sqlite3 -json /root/.n8n/database.sqlite "SELECT id, workflowId, status, startedAt FROM execution_entity ORDER BY startedAt DESC LIMIT 20;"');
        
        console.log(res.stdout);

        ssh.dispose();
    } catch (err) {
        console.error('Fetch failed:', err.message);
    }
}

getRecent();
