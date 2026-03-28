const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function restoreBot() {
    try {
        const localPath = 'c:\\Users\\Cristian\\.gemini\\antigravity\\crm cannabis\\n8n-crm-cannabis-workflow.json.perfected';
        const workflowJson = fs.readFileSync(localPath, 'utf8');
        const workflow = JSON.parse(workflowJson);
        
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod' 
        });

        const db = '/root/.n8n/database.sqlite';
        const workflowId = 'yC1ekEMc12CkBmwH'; // The one that worked yesterday
        const projectId = 'ziw8VANNdEGr5wY3'; // Verified personal project
        const webhookId = 'd6aa2cb3-abb0-42bf-988b-01da76a1a69e';
        const path = 'wa-inbound';

        console.log(`--- Restoring Bot Workflow ${workflowId} ---`);

        // 1. Prepare data for insertion
        const nodesStr = JSON.stringify(workflow.nodes).replace(/'/g, "''");
        const connectionsStr = JSON.stringify(workflow.connections).replace(/'/g, "''");
        const settingsStr = JSON.stringify(workflow.settings || {}).replace(/'/g, "''");

        // 2. Clear old bot entries
        await ssh.execCommand(`sqlite3 ${db} "DELETE FROM workflow_entity WHERE id = '${workflowId}';"`);
        await ssh.execCommand(`sqlite3 ${db} "DELETE FROM shared_workflow WHERE workflowId = '${workflowId}';"`);
        await ssh.execCommand(`sqlite3 ${db} "DELETE FROM workflow_published_version WHERE workflowId = '${workflowId}';"`);
        await ssh.execCommand(`sqlite3 ${db} "DELETE FROM webhook_entity WHERE workflowId = '${workflowId}';"`);

        // 3. Insert into workflow_entity
        console.log('Inserting workflow entity...');
        await ssh.execCommand(`sqlite3 ${db} "INSERT INTO workflow_entity (id, name, active, nodes, connections, settings, versionCounter) VALUES ('${workflowId}', 'CRM Cannabis - bot', 1, '${nodesStr}', '${connectionsStr}', '${settingsStr}', 1);"`);

        // 4. Insert into shared_workflow (OWNERSHIP)
        console.log('Setting ownership...');
        await ssh.execCommand(`sqlite3 ${db} "INSERT INTO shared_workflow (workflowId, projectId, role) VALUES ('${workflowId}', '${projectId}', 'workflow:owner');"`);

        // 5. Insert into workflow_published_version (PRODUCTION)
        console.log('Publishing version...');
        await ssh.execCommand(`sqlite3 ${db} "INSERT INTO workflow_published_version (workflowId, nodes, connections, settings) VALUES ('${workflowId}', '${nodesStr}', '${connectionsStr}', '${settingsStr}');"`);

        // 6. Insert into webhook_entity (ROUTING)
        console.log('Registering webhook...');
        await ssh.execCommand(`sqlite3 ${db} "INSERT INTO webhook_entity (workflowId, webhookId, method, path, node) VALUES ('${workflowId}', '${webhookId}', 'POST', '${path}', 'Webhook WhatsApp');"`);

        // 7. DEACTIVATE the "Sale" workflow to avoid path conflicts if any
        console.log('Cleaning up duplicate paths...');
        await ssh.execCommand(`sqlite3 ${db} "UPDATE workflow_entity SET active = 0 WHERE id = 'scpZdPe5Cp4MG98G';"`);
        await ssh.execCommand(`sqlite3 ${db} "DELETE FROM webhook_entity WHERE workflowId = 'scpZdPe5Cp4MG98G';"`);

        // 8. Restart n8n
        console.log('Restarting n8n...');
        await ssh.execCommand('pm2 restart n8n-service');

        console.log('--- Restoration Complete ---');
        ssh.dispose();
    } catch (err) {
        console.error('Restoration failed:', err.message);
    }
}

restoreBot();
