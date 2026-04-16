const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function restoreWithPython() {
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

        console.log('--- Restoration via Python Bridge ---');

        const pythonInserter = `
import sqlite3
import json

db_path = '${db}'
workflow_id = '${workflowId}'
project_id = '${projectId}'
webhook_id = '${webhookId}'

with open('/tmp/bot.json', 'r', encoding='utf-8') as f:
    workflow = json.load(f)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Cleanup
cursor.execute("DELETE FROM workflow_entity WHERE id = ?", (workflow_id,))
cursor.execute("DELETE FROM shared_workflow WHERE workflowId = ?", (workflow_id,))
cursor.execute("DELETE FROM workflow_published_version WHERE workflowId = ?", (workflow_id,))
cursor.execute("DELETE FROM webhook_entity WHERE workflowId = ?", (workflow_id,))

# 2. Preparation
nodes_str = json.dumps(workflow['nodes'])
connections_str = json.dumps(workflow['connections'])
settings_str = json.dumps(workflow.get('settings', {}))

# 3. Insertion
cursor.execute("""
    INSERT INTO workflow_entity (id, name, active, nodes, connections, settings, versionCounter)
    VALUES (?, ?, 1, ?, ?, ?, 1)
""", (workflow_id, 'CRM Cannabis - bot', nodes_str, connections_str, settings_str))

cursor.execute("""
    INSERT INTO shared_workflow (workflowId, projectId, role)
    VALUES (?, ?, 'workflow:owner')
""", (workflow_id, project_id))

cursor.execute("""
    INSERT INTO workflow_published_version (workflowId, nodes, connections, settings)
    VALUES (?, ?, ?, ?)
""", (workflow_id, nodes_str, connections_str, settings_str))

cursor.execute("""
    INSERT INTO webhook_entity (workflowId, webhookId, method, path, node)
    VALUES (?, ?, 'POST', 'wa-inbound', 'Webhook WhatsApp')
""", (workflow_id, webhook_id))

# 4. Deactivate the Sale workflow
cursor.execute("UPDATE workflow_entity SET active = 0 WHERE id = 'scpZdPe5Cp4MG98G'")
cursor.execute("DELETE FROM webhook_entity WHERE workflowId = 'scpZdPe5Cp4MG98G'")

conn.commit()
conn.close()
print('Python: Insertion finished successfully.')
        `;

        // 1. Upload JSON (ensure it's there)
        console.log('Pushing bot.json...');
        await ssh.execCommand(`cat > /tmp/bot.json << 'EOF'\n${workflowJson}\nEOF`);

        // 2. Upload Python Script
        console.log('Pushing python script...');
        await ssh.execCommand(`cat > /tmp/insert_bot.py << 'EOF'\n${pythonInserter}\nEOF`);

        // 3. Execute Python
        console.log('Running python bridge...');
        const res = await ssh.execCommand('python3 /tmp/insert_bot.py');
        console.log('Python output:', res.stdout);
        if (res.stderr) console.error('Python stderr:', res.stderr);

        // 4. Restart n8n
        console.log('Restarting n8n...');
        await ssh.execCommand('pm2 restart n8n-service');

        console.log('--- Restoration Complete ---');
        ssh.dispose();
    } catch (err) {
        console.error('Final Restoration failed:', err.message);
    }
}

restoreWithPython();
