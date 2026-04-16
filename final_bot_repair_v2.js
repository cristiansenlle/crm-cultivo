const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function finalRepair() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'HIDDEN_SECRET_BY_AI' 
        });

        const db = '/root/.n8n/database.sqlite';
        const workflowId = 'yC1ekEMc12CkBmwH';

        console.log(`--- Final Repair of Bot Workflow ${workflowId} ---`);

        // 1. Get current workflow
        const res = await ssh.execCommand(`sqlite3 -json ${db} "SELECT nodes, connections FROM workflow_entity WHERE id = '${workflowId}';"`);
        const rows = JSON.parse(res.stdout);
        const nodes = JSON.parse(rows[0].nodes);
        const connections = JSON.parse(rows[0].connections);

        // 2. Define the WhatsApp Node
        const waNode = {
            "parameters": {
                "phoneNumberId": "489993374191494",
                "recipientPhoneNumber": "={{ $json.phone || $json.recipient || '5491136254422' }}",
                "text": "={{ $json.response || $json.reply || $json.Mensaje || $json.text }}"
            },
            "id": "wa-send-id-final",
            "name": "WhatsApp (Business-API)",
            "type": "n8n-nodes-base.whatsAppBusiness",
            "typeVersion": 1,
            "position": [1400, 600],
            "credentials": {
                "whatsAppBusinessCloudApi": {
                    "id": "B1MpxN70I3YlVp7k", 
                    "name": "WhatsApp Business Cloud API account"
                }
            }
        };

        // 3. Add node if not exists
        if (!nodes.find(n => n.name === 'WhatsApp (Business-API)')) {
            nodes.push(waNode);
        }

        // 4. Create connections from formatters
        const formatters = ['Format WA Response', 'Format Env Response', 'Format Sale Response'];
        formatters.forEach(fName => {
            if (!connections[fName]) connections[fName] = { "main": [[]] };
            // Add connection to WhatsApp node if not exists
            if (!connections[fName].main[0].find(c => c.node === 'WhatsApp (Business-API)')) {
                connections[fName].main[0].push({
                    "node": "WhatsApp (Business-API)",
                    "type": "main",
                    "index": 0
                });
            }
        });

        // 5. Update Database
        const nodesStr = JSON.stringify(nodes).replace(/'/g, "''");
        const connectionsStr = JSON.stringify(connections).replace(/'/g, "''");

        console.log('Updating database...');
        await ssh.execCommand(`sqlite3 ${db} "UPDATE workflow_entity SET nodes = '${nodesStr}', connections = '${connectionsStr}' WHERE id = '${workflowId}';"`);
        await ssh.execCommand(`sqlite3 ${db} "UPDATE workflow_published_version SET nodes = '${nodesStr}', connections = '${connectionsStr}' WHERE workflowId = '${workflowId}';"`);

        // 6. Restart n8n
        console.log('Restarting n8n...');
        await ssh.execCommand('pm2 restart n8n-service');

        console.log('--- Final Repair Complete ---');
        ssh.dispose();
    } catch (err) {
        console.error('Repair failed:', err.message);
    }
}

finalRepair();
