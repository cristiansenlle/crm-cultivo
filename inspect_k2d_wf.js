const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
        
        console.log('--- Inspecting Alternative Workflow (k2d) ---');
        
        const wfRes = await ssh.execCommand("sqlite3 -json /root/.n8n/database.sqlite \"SELECT id, name, active, versionId FROM workflow_entity WHERE id = 'k2d7SbuTEeGHCDzR';\"");
        console.log('Workflow Metadata:', wfRes.stdout || 'NotFound');

        const webRes = await ssh.execCommand("sqlite3 -json /root/.n8n/database.sqlite \"SELECT * FROM webhook_entity WHERE workflowId = 'k2d7SbuTEeGHCDzR';\"");
        console.log('Webhooks Metadata:', webRes.stdout || 'NotFound');

        ssh.dispose();
    } catch (err) {
        console.error('Inspection failed:', err.message);
    }
})();
