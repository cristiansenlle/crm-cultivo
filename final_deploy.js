const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

async function finalDeploy() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'HIDDEN_SECRET_BY_AI' 
        });

        console.log('--- Stopping n8n ---');
        await ssh.execCommand('pm2 stop n8n-service');

        const workflowId = 'scpZdPe5Cp4MG98G';
        const legacyId = 'yC1ekEMc12CkBmwH';

        console.log('--- Cleanup Legacy ---');
        await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "DELETE FROM workflow_published_version WHERE workflowId = '${legacyId}';"`);
        await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "DELETE FROM workflow_entity WHERE id = '${legacyId}';"`);

        console.log('--- Updating Database (Core) ---');
        const workflowJson = fs.readFileSync('n8n-crm-cannabis-workflow.json', 'utf8');
        const wfData = JSON.parse(workflowJson);
        const nodesSql = JSON.stringify(wfData.nodes).replace(/'/g, "''");
        const connectionsSql = JSON.stringify(wfData.connections).replace(/'/g, "''");

        // Update workflow_entity
        const updateCore = `UPDATE workflow_entity SET nodes = '${nodesSql}', connections = '${connectionsSql}', active = 1 WHERE id = '${workflowId}';`;
        await ssh.execCommand('echo "' + updateCore.replace(/"/g, '\\"') + '" > /tmp/update_wf_core.sql');
        await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite < /tmp/update_wf_core.sql');

        console.log('--- Updating Database (Published) ---');
        // Delete existing published record for the target ID to avoid conflict on INSERT
        await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "DELETE FROM workflow_published_version WHERE workflowId = '${workflowId}';"`);
        
        // Insert new published record
        const insertPub = `INSERT INTO workflow_published_version (workflowId, nodes, connections, settings, versionId, createdAt, updatedAt) 
SELECT id, nodes, connections, settings, versionId, datetime('now'), datetime('now') FROM workflow_entity WHERE id = '${workflowId}';`;
        await ssh.execCommand('echo "' + insertPub.replace(/"/g, '\\"') + '" > /tmp/update_wf_pub.sql');
        await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite < /tmp/update_wf_pub.sql');

        console.log('--- Starting n8n ---');
        await ssh.execCommand('pm2 start n8n-service');
        
        console.log('Final deployment complete.');
        ssh.dispose();
    } catch (err) {
        console.error('Final deploy failed:', err.message);
    }
}

finalDeploy();
