const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function deepAuditNested() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod' 
        });

        // The nested path we found
        const dbPath = '/root/.n8n/.n8n/database.sqlite';
        const targetId = 'scpZdPe5Cp4MG98G';
        const legacyId = 'yC1ekEMc12CkBmwH';
        
        console.log(`--- Auditing Database at ${dbPath} ---`);
        
        console.log('--- Workflow Entity Check ---');
        const wfRes = await ssh.execCommand(`sqlite3 -json ${dbPath} "SELECT id, name, active, userId FROM workflow_entity WHERE id IN ('${targetId}', '${legacyId}');"`);
        console.log('Workflows:', wfRes.stdout);

        console.log('--- Published Version Check ---');
        const pubRes = await ssh.execCommand(`sqlite3 -json ${dbPath} "SELECT workflowId, count(*) as count FROM workflow_published_version WHERE workflowId IN ('${targetId}', '${legacyId}') GROUP BY workflowId;"`);
        console.log('Published:', pubRes.stdout);

        console.log('--- Webhook Entity Check ---');
        const webRes = await ssh.execCommand(`sqlite3 -json ${dbPath} "SELECT workflowId, path, method FROM webhook_entity;"`);
        console.log('Active Webhooks:', webRes.stdout);

        ssh.dispose();
    } catch (err) {
        console.error('Audit failed:', err.message);
    }
}

deepAuditNested();
