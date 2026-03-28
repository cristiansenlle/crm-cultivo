const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fullProdFix() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod' 
        });

        const db = '/root/.n8n/database.sqlite';
        const workflowId = 'scpZdPe5Cp4MG98G';
        const webhookId = 'd6aa2cb3-abb0-42bf-988b-01da76a1a69e';
        const path = 'wa-inbound';

        console.log('--- Rescuing Workflow Activation ---');

        // 1. Get raw nodes and connections from workflow_entity
        const resData = await ssh.execCommand(`sqlite3 -json ${db} "SELECT nodes, connections, settings FROM workflow_entity WHERE id = '${workflowId}';"`);
        const rows = JSON.parse(resData.stdout);
        const { nodes, connections, settings } = rows[0];

        // 2. Insert into workflow_published_version
        console.log('Publishing version...');
        await ssh.execCommand(`sqlite3 ${db} "DELETE FROM workflow_published_version WHERE workflowId = '${workflowId}';"`);
        await ssh.execCommand(`sqlite3 ${db} "INSERT INTO workflow_published_version (workflowId, nodes, connections, settings) VALUES ('${workflowId}', '${nodes.replace(/'/g, "''")}', '${connections.replace(/'/g, "''")}', '${settings.replace(/'/g, "''")}');"`);

        // 3. Insert into webhook_entity
        console.log('Registering webhook...');
        await ssh.execCommand(`sqlite3 ${db} "DELETE FROM webhook_entity WHERE path = '${path}';"`);
        await ssh.execCommand(`sqlite3 ${db} "INSERT INTO webhook_entity (workflowId, webhookId, method, path, node) VALUES ('${workflowId}', '${webhookId}', 'POST', '${path}', 'Webhook WhatsApp');"`);

        // 4. Ensure activation bits
        console.log('Ensuring activation...');
        await ssh.execCommand(`sqlite3 ${db} "UPDATE workflow_entity SET active = 1 WHERE id = '${workflowId}';"`);

        // 5. Restart n8n to pick up database changes
        console.log('Restarting n8n...');
        await ssh.execCommand('pm2 restart n8n-service');

        console.log('--- Fix Complete ---');
        ssh.dispose();
    } catch (err) {
        console.error('Fix failed:', err.message);
    }
}

fullProdFix();
