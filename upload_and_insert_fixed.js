const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function uploadAndInsert() {
    try {
        const localPath = 'c:\\Users\\Cristian\\.gemini\\antigravity\\crm cannabis\\n8n-crm-cannabis-workflow.json.perfected';
        const workflowJson = fs.readFileSync(localPath, 'utf8');
        
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'HIDDEN_SECRET_BY_AI' 
        });

        const db = '/root/.n8n/database.sqlite';
        const workflowId = 'yC1ekEMc12CkBmwH';
        const projectId = 'ziw8VANNdEGr5wY3';
        const webhookId = 'd6aa2cb3-abb0-42bf-988b-01da76a1a69e';

        console.log('--- Uploading Bot JSON to Server ---');
        // We use a temporary JS file on the server to handle the insertion to avoid shell limits
        const serverInserter = `
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const db = new sqlite3.Database('${db}');
const workflowId = '${workflowId}';
const projectId = '${projectId}';
const webhookId = '${webhookId}';
const workflow = JSON.parse(fs.readFileSync('/tmp/bot.json', 'utf8'));

db.serialize(() => {
    db.run("DELETE FROM workflow_entity WHERE id = ?", [workflowId]);
    db.run("DELETE FROM shared_workflow WHERE workflowId = ?", [workflowId]);
    db.run("DELETE FROM workflow_published_version WHERE workflowId = ?", [workflowId]);
    db.run("DELETE FROM webhook_entity WHERE workflowId = ?", [workflowId]);

    const nodesStr = JSON.stringify(workflow.nodes);
    const connectionsStr = JSON.stringify(workflow.connections);
    const settingsStr = JSON.stringify(workflow.settings || {});

    db.run("INSERT INTO workflow_entity (id, name, active, nodes, connections, settings, versionCounter) VALUES (?, ?, 1, ?, ?, ?, 1)", 
        [workflowId, 'CRM Cannabis - bot', nodesStr, connectionsStr, settingsStr], (err) => {
            if (err) console.error('Workflow Entity Error:', err.message);
        });

    db.run("INSERT INTO shared_workflow (workflowId, projectId, role) VALUES (?, ?, 'workflow:owner')", 
        [workflowId, projectId], (err) => {
            if (err) console.error('Shared Workflow Error:', err.message);
        });

    db.run("INSERT INTO workflow_published_version (workflowId, nodes, connections, settings) VALUES (?, ?, ?, ?)", 
        [workflowId, nodesStr, connectionsStr, settingsStr], (err) => {
            if (err) console.error('Published Version Error:', err.message);
        });

    db.run("INSERT INTO webhook_entity (workflowId, webhookId, method, path, node) VALUES (?, ?, 'POST', 'wa-inbound', 'Webhook WhatsApp')", 
        [workflowId, webhookId], (err) => {
            if (err) console.error('Webhook Entity Error:', err.message);
        });
    
    // Deactivate the other one
    db.run("UPDATE workflow_entity SET active = 0 WHERE id = 'scpZdPe5Cp4MG98G'");
    db.run("DELETE FROM webhook_entity WHERE workflowId = 'scpZdPe5Cp4MG98G'");
});
db.close(() => console.log('Insertion finished.'));
        `;

        // 1. Write the JSON to a file on the server
        console.log('Transferring JSON...');
        await ssh.execCommand(`cat > /tmp/bot.json << 'EOF'\n${workflowJson}\nEOF`);

        // 2. Write the inserter script to a file on the server
        console.log('Transferring Inserter Script...');
        await ssh.execCommand(`cat > /tmp/insert_bot.js << 'EOF'\n${serverInserter}\nEOF`);

        // 3. Run the inserter script (n8n usually has 'sqlite3' package if it's running n8n, but we might need to use the n8n container instead)
        // Wait, n8n is running in PM2, let's see if 'sqlite3' is available in the global node_modules or n8n directory
        console.log('Executing Insertion...');
        const res = await ssh.execCommand('node /tmp/insert_bot.js', { cwd: '/root' });
        console.log('Insertion Output:', res.stdout);
        if (res.stderr) console.error('Insertion Stderr:', res.stderr);

        // 4. Cleanup
        await ssh.execCommand('rm /tmp/bot.json /tmp/insert_bot.js');

        // 5. Restart
        console.log('Restarting n8n...');
        await ssh.execCommand('pm2 restart n8n-service');

        console.log('--- restoration Complete ---');
        ssh.dispose();
    } catch (err) {
        console.error('Restoration failed:', err.message);
    }
}

uploadAndInsert();
