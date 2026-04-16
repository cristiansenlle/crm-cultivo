const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
        
        console.log('--- Database Audit ---');
        
        const res = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT id, name, active FROM workflow_entity;\"");
        console.log('Workflows:\n', res.stdout);

        const res2 = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT workflowId, count(*) FROM webhook_entity GROUP BY workflowId;\"");
        console.log('Webhooks:\n', res2.stdout);

        ssh.dispose();
    } catch (err) {
        console.error('Audit failed:', err.message);
    }
})();
