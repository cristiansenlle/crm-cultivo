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

        const res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, workflowId, startedAt, stoppedAt FROM execution_entity ORDER BY startedAt DESC LIMIT 5;"');
        console.log("Last 5 executions:\n", res.stdout);

        const lastId = res.stdout.split('\n')[0].split('|')[0].trim();
        if (lastId) {
            console.log("Fetching execution data for:", lastId);
            const dataRes = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "SELECT data FROM execution_entity WHERE id='${lastId}';"`);
            fs.writeFileSync('last_execution.json', dataRes.stdout);
            console.log("Saved to last_execution.json");
        }

        ssh.dispose();
    } catch(e) {
        console.error(e);
        ssh.dispose();
    }
}
getExecutions();
