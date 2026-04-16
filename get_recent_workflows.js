const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function getExecutions() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, workflowId, startedAt, stoppedAt FROM execution_entity ORDER BY startedAt DESC LIMIT 15;"');
        console.log("Last 15 executions:\n", res.stdout);
        ssh.dispose();
    } catch(e) {
        console.error(e);
        ssh.dispose();
    }
}
getExecutions();
