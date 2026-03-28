const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

async function addWhatsappNode() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod' 
        });

        const targetId = 'scpZdPe5Cp4MG98G';
        
        console.log(`--- Repairing missing WhatsApp node for ${targetId} ---`);
        const res = await ssh.execCommand(`sqlite3 -json /root/.n8n/database.sqlite "SELECT nodes, connections FROM workflow_entity WHERE id = '${targetId}';"`);
        const row = JSON.parse(res.stdout)[0];
        let nodes = JSON.parse(row.nodes);
        let connections = JSON.parse(row.connections);

        // 1. Define the missing WhatsApp node
        const whatsappNode = {
            "parameters": {
                "phoneNumberId": "489993374191494",
                "recipientPhoneNumber": "={{ $json.phone }}",
                "messageType": "text",
                "text": "={{ $json.response }}"
            },
            "id": "wa-send-001",
            "name": "WhatsApp (Business-API)",
            "type": "n8n-nodes-base.whatsAppBusinessApi",
            "typeVersion": 1,
            "position": [1100, 500],
            "credentials": {
                "whatsAppBusinessApi": {
                    "id": "B79S5GkUo4W0rC6i",
                    "name": "WhatsApp Business API account"
                }
            }
        };

        // 2. Add node if not exists
        if (!nodes.find(n => n.name === whatsappNode.name)) {
            nodes.push(whatsappNode);
            console.log('Added WhatsApp node.');
        }

        // 3. Ensure connection from 'Format WA Response' to the new node
        const formatNodeName = 'Format WA Response';
        if (!connections[formatNodeName]) connections[formatNodeName] = { "main": [[]] };
        
        const existingConn = connections[formatNodeName].main[0].find(c => c.node === whatsappNode.name);
        if (!existingConn) {
            connections[formatNodeName].main[0].push({
                "node": whatsappNode.name,
                "type": "main",
                "index": 0
            });
            console.log('Connected Format node to WhatsApp node.');
        }

        // 4. Update Database
        const nodesSql = JSON.stringify(nodes).replace(/'/g, "''");
        const connectionsSql = JSON.stringify(connections).replace(/'/g, "''");
        
        await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "UPDATE workflow_entity SET nodes = '${nodesSql}', connections = '${connectionsSql}' WHERE id = '${targetId}';"`);
        await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "DELETE FROM workflow_published_version WHERE workflowId = '${targetId}';"`);
        await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "INSERT INTO workflow_published_version (workflowId, nodes, connections, settings, versionId, createdAt, updatedAt) SELECT id, nodes, connections, settings, versionId, datetime('now'), datetime('now') FROM workflow_entity WHERE id = '${targetId}';"`);

        console.log('--- Restarting n8n ---');
        await ssh.execCommand('pm2 restart n8n-service');
        console.log('Fix complete.');

        ssh.dispose();
    } catch (err) {
        console.error('Fix failed:', err.message);
    }
}

addWhatsappNode();
