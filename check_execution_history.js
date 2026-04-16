const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkExecutions() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'HIDDEN_SECRET_BY_AI' 
        });

        const workflowId = 'scpZdPe5Cp4MG98G';
        
        console.log(`--- Checking Recent Executions for ${workflowId} ---`);
        const res = await ssh.execCommand(`sqlite3 -json /root/.n8n/database.sqlite "SELECT id, workflowId, status, startedAt, stoppedAt FROM execution_entity WHERE workflowId = '${workflowId}' ORDER BY startedAt DESC LIMIT 10;"`);
        
        console.log('Recent Executions:', res.stdout);

        const executions = JSON.parse(res.stdout || '[]');
        if (executions.length > 0) {
            const lastExec = executions[0];
            console.log(`--- Deep dive into latest execution: ${lastExec.id} ---`);
            const detailsRes = await ssh.execCommand(`sqlite3 -json /root/.n8n/database.sqlite "SELECT workflowData, data FROM execution_entity WHERE id = ${lastExec.id};"`);
            // Note: data contains the full node-by-node execution log, potentially huge
            console.log('Data summary length:', detailsRes.stdout.length);
        } else {
            console.log('No executions found for this workflow.');
        }

        ssh.dispose();
    } catch (err) {
        console.error('Check failed:', err.message);
    }
}

checkExecutions();
