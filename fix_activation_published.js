const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
        
        console.log('--- Activation Fix ---');
        
        // 1. Check current published version
        const checkRes = await ssh.execCommand('sqlite3 -json /root/.n8n/database.sqlite "SELECT workflowId FROM workflow_published_version WHERE workflowId = \'scpZdPe5Cp4MG98G\';"');
        console.log('Published version check:', checkRes.stdout || 'Not found');

        if (!checkRes.stdout || checkRes.stdout === 'Not found') {
            console.log('Inserting published version record...');
            // We insert a record that references our workflow. 
            // In n8n 1.x+, this table links the workflow to its "published" state.
            await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"INSERT INTO workflow_published_version (workflowId, nodes, connections, settings, versionId, createdAt, updatedAt) SELECT id, nodes, connections, settings, versionId, datetime('now'), datetime('now') FROM workflow_entity WHERE id = 'scpZdPe5Cp4MG98G';\"");
        } else {
            console.log('Updating published version record...');
            await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"UPDATE workflow_published_version SET (nodes, connections, settings, versionId, updatedAt) = (SELECT nodes, connections, settings, versionId, datetime('now') FROM workflow_entity WHERE id = 'scpZdPe5Cp4MG98G') WHERE workflowId = 'scpZdPe5Cp4MG98G';\"");
        }

        console.log('Setting active=1...');
        await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"UPDATE workflow_entity SET active = 1 WHERE id = 'scpZdPe5Cp4MG98G';\"");

        console.log('Restarting PM2...');
        await ssh.execCommand('pm2 restart n8n-service');
        
        console.log('Done.');
        ssh.dispose();
    } catch (err) {
        console.error('Activation fix failed:', err.message);
    }
})();
