const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function analyzeExecutions() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod' 
        });

        console.log('--- Last 10 Executions ---');
        const execRes = await ssh.execCommand('sqlite3 -json /root/.n8n/database.sqlite "SELECT id, workflowId, status, finished, mode, startedAt, stoppedAt FROM execution_entity ORDER BY startedAt DESC LIMIT 10;"');
        
        const executions = JSON.parse(execRes.stdout || '[]');
        executions.forEach(e => {
            console.log(`- Execution: ${e.id} | Workflow: ${e.workflowId} | Status: ${e.status} | Started: ${e.startedAt}`);
        });

        console.log('\n--- Deactivating Duplicate Workflow yC1ekEMc12CkBmwH ---');
        const deactivateRes = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "UPDATE workflow_entity SET active = 0 WHERE id = \'yC1ekEMc12CkBmwH\';"');
        console.log('Deactivation status:', deactivateRes.stderr ? 'Error: ' + deactivateRes.stderr : 'Success');

        console.log('\n--- Ensuring scpZdPe5Cp4MG98G is Active ---');
        const activateRes = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "UPDATE workflow_entity SET active = 1 WHERE id = \'scpZdPe5Cp4MG98G\';"');
        console.log('Activation status:', activateRes.stderr ? 'Error: ' + activateRes.stderr : 'Success');

        console.log('\n--- Restarting n8n ---');
        await ssh.execCommand('pm2 restart n8n-service');
        console.log('Service restarted.');

        ssh.dispose();
    } catch (err) {
        console.error('Execution analysis failed:', err.message);
    }
}

analyzeExecutions();
