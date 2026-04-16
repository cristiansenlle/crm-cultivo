const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
        
        console.log('--- Checking Active Workflows and Published Nodes ---');
        
        const activeWF = await ssh.execCommand("sqlite3 -json /root/.n8n/database.sqlite \"SELECT id, name FROM workflow_entity WHERE active = 1;\"");
        console.log('Active Workflows:', activeWF.stdout);

        const published = await ssh.execCommand("sqlite3 -json /root/.n8n/database.sqlite \"SELECT workflowId, nodes FROM workflow_published_version;\"");
        const pubData = JSON.parse(published.stdout || '[]');
        
        pubData.forEach(p => {
            const nodes = JSON.parse(p.nodes);
            const found = nodes.filter(n => n.type.toLowerCase().includes('executecommand'));
            if (found.length > 0) {
                console.log(`Found offending nodes in Published version of ${p.workflowId}:`, found.map(n => n.name));
            }
        });

        ssh.dispose();
    } catch (err) {
        console.error('Check failed:', err.message);
    }
})();
