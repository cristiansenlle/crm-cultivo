const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

async function deployRepairedWorkflow() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'HIDDEN_SECRET_BY_AI' 
        });

        console.log('--- Stopping n8n ---');
        await ssh.execCommand('pm2 stop n8n-service');

        console.log('--- Uploading Reparado ---');
        await ssh.putFile('n8n-crm-cannabis-workflow.json', '/root/n8n-crm-cannabis-workflow.json');

        console.log('--- Updating Database ---');
        // We read the JSON file content and escape it for SQLite
        const workflowJson = fs.readFileSync('n8n-crm-cannabis-workflow.json', 'utf8');
        const wfData = JSON.parse(workflowJson);
        const nodesSql = JSON.stringify(wfData.nodes).replace(/'/g, "''");
        const connectionsSql = JSON.stringify(wfData.connections).replace(/'/g, "''");

        const updateQuery = `UPDATE workflow_entity SET nodes = '${nodesSql}', connections = '${connectionsSql}', active = 1 WHERE id = 'scpZdPe5Cp4MG98G';`;
        
        // Write query to a temp file on the server to avoid shell limit
        await ssh.execCommand('echo "' + updateQuery.replace(/"/g, '\\"') + '" > /tmp/update_wf.sql');
        await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite < /tmp/update_wf.sql');
        
        console.log('Database updated.');

        console.log('--- Checking Credentials ---');
        const credsRes = await ssh.execCommand('sqlite3 -json /root/.n8n/database.sqlite "SELECT id, name, type FROM credentials_entity;"');
        console.log('Credentials found:', credsRes.stdout);

        console.log('--- Starting n8n ---');
        await ssh.execCommand('pm2 start n8n-service');
        
        console.log('Deployment complete.');
        ssh.dispose();
    } catch (err) {
        console.error('Deployment failed:', err.message);
    }
}

deployRepairedWorkflow();
