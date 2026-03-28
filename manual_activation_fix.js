const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
        
        console.log('--- Manual Activation Fix ---');
        const sql = `
DELETE FROM webhook_entity WHERE workflowId = 'scpZdPe5Cp4MG98G';
INSERT INTO webhook_entity (workflowId, webhookPath, method, node, pathLength) VALUES ('scpZdPe5Cp4MG98G', 'wa-inbound', 'POST', 'Webhook WhatsApp', 1);
INSERT INTO webhook_entity (workflowId, webhookPath, method, node, pathLength) VALUES ('scpZdPe5Cp4MG98G', 'get-telemetry', 'GET', 'Webhook Get Telemetry (WhatsApp)', 1);
UPDATE workflow_entity SET active = 1 WHERE id = 'scpZdPe5Cp4MG98G';
REPLACE INTO workflow_published_version (workflowId, nodes, connections, settings, versionId, createdAt, updatedAt) 
SELECT id, nodes, connections, settings, versionId, datetime('now'), datetime('now') FROM workflow_entity WHERE id = 'scpZdPe5Cp4MG98G';
`;
        await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "${sql}"`);
        console.log('Database updated.');

        console.log('Restarting PM2...');
        await ssh.execCommand('pm2 restart n8n-service');
        
        console.log('Done.');
        ssh.dispose();
    } catch (err) {
        console.error('Manual activation fix failed:', err.message);
    }
})();
