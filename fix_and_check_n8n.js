const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fixN8nConflictAndCheckFlow() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod' 
        });

        console.log('--- Database Cleanup ---');
        // Delete the duplicate that seems to be the one currently active
        console.log('Deleting duplicate yC1ekEMc12CkBmwH...');
        await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "DELETE FROM workflow_entity WHERE id = \'yC1ekEMc12CkBmwH\';"');
        
        // Ensure scpZdPe5Cp4MG98G is active
        console.log('Activating definitive scpZdPe5Cp4MG98G...');
        await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "UPDATE workflow_entity SET active = 1 WHERE id = \'scpZdPe5Cp4MG98G\';"');

        // Check the nodes of the definitive workflow to ensure connectivity to the response node
        const res = await ssh.execCommand('sqlite3 -json /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id = \'scpZdPe5Cp4MG98G\';"');
        const workflow = JSON.parse(res.stdout || '[]')[0];
        if (workflow) {
            const nodes = JSON.parse(workflow.nodes);
            const formatWANode = nodes.find(n => n.name === 'Format WA Response');
            if (formatWANode) {
                console.log('Format WA Response node found.');
                // Check if the AI Agent connects to it
                const agent = nodes.find(n => n.name === 'AI Agent (Function Calling)');
                if (agent) {
                    console.log('AI Agent found. Checking if it has continueOnFail...');
                    console.log('Parameters:', JSON.stringify(agent.parameters, null, 2));
                }
            } else {
                console.log('WARNING: Format WA Response node MISSING in scpZdPe5Cp4MG98G');
            }
        }

        console.log('\n--- Restarting n8n ---');
        await ssh.execCommand('pm2 restart n8n-service');
        console.log('Service restarted.');

        ssh.dispose();
    } catch (err) {
        console.error('Fix failed:', err.message);
    }
}

fixN8nConflictAndCheckFlow();
