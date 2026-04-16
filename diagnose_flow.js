const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT nodes, connections FROM workflow_entity WHERE id=\'scpZdPe5Cp4MG98G\';"');
        const output = res.stdout;
        
        // Find connections for "Webhook Telemetry"
        const connMatch = output.match(/\"Webhook Telemetry\":\s*\{\s*\"main\":\s*\[\s*\[\s*\{\s*\"node\":\s*\"(.*?)\"/);
        if (connMatch) {
            console.log('Telemetry Webhook connects to:', connMatch[1]);
            
            // Now find the node details in the nodes array
            const nodeName = connMatch[1];
            const nodeRegex = new RegExp(`\\{[^{}]*?"name"\\s*:\\s*"${nodeName}"[^{}]*?\\}`, 'g');
            const nodeMatches = output.match(nodeRegex);
            if (nodeMatches) {
                console.log('Node details:', nodeMatches[0]);
            } else {
                console.log('Could not find node details for:', nodeName);
            }
        } else {
            console.log('Could not find connection for Webhook Telemetry');
            // Try searching for the connection string in a more relaxed way
            const lines = output.split('\n');
            const telemetryLine = lines.find(l => l.includes('"Webhook Telemetry"'));
            if (telemetryLine) {
                console.log('Found line with Webhook Telemetry:', telemetryLine.substring(0, 500));
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
})();
