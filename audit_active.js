const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function auditActive() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'HIDDEN_SECRET_BY_AI' 
        });

        const db = '/root/.n8n/database.sqlite';
        console.log('--- Current Database Audit ---');

        const workflows = await ssh.execCommand(`sqlite3 -json ${db} "SELECT id, name, active FROM workflow_entity;"`);
        console.log('Workflows in entity table:', workflows.stdout);

        const webhooks = await ssh.execCommand(`sqlite3 -json ${db} "SELECT workflowId, webhookPath, node FROM webhook_entity;"`);
        console.log('Registered webhooks:', webhooks.stdout);

        const published = await ssh.execCommand(`sqlite3 -json ${db} "SELECT workflowId FROM workflow_published_version;"`);
        console.log('Published versions:', published.stdout);

        ssh.dispose();
    } catch (err) {
        console.error('Audit failed:', err.message);
    }
}

auditActive();
