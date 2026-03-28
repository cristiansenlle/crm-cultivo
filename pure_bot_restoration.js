const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function pureRestoration() {
    try {
        // Use the original JSON, NOT the .perfected one
        const localPath = 'c:\\Users\\Cristian\\.gemini\\antigravity\\crm cannabis\\n8n-crm-cannabis-workflow.json';
        const workflowJson = fs.readFileSync(localPath, 'utf8');
        const workflow = JSON.parse(workflowJson);
        
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod' 
        });

        const db = '/root/.n8n/database.sqlite';
        const workflowId = 'yC1ekEMc12CkBmwH';
        const projectId = 'ziw8VANNdEGr5wY3';
        const webhookId = 'd6aa2cb3-abb0-42bf-988b-01da76a1a69e';

        console.log(`--- Pure Restoration of Bot Workflow ${workflowId} ---`);

        // Ensure nodes don't have the broken node if it was in the local file (unlikely but safe)
        workflow.nodes = workflow.nodes.filter(n => n.type !== 'n8n-nodes-base.whatsAppBusiness');

        // Prepare JSON for file transfer
        const finalJson = JSON.stringify(workflow);

        // 1. Upload JSON
        console.log('Transferring JSON...');
        await ssh.execCommand(`cat > /tmp/bot_pure.json << 'EOF'\n${finalJson}\nEOF`);

        // 2. Python Inserter (with fixed schema for n8n 1.0+)
        const pythonInserter = `
import sqlite3
import json
import uuid

db_path = '${db}'
workflow_id = '${workflowId}'
project_id = '${projectId}'
webhook_id = '${webhookId}'

with open('/tmp/bot_pure.json', 'r', encoding='utf-8') as f:
    workflow = json.load(f)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Cleanup
cursor.execute("DELETE FROM workflow_entity WHERE id = ?", (workflow_id,))
cursor.execute("DELETE FROM shared_workflow WHERE workflowId = ?", (workflow_id,))
cursor.execute("DELETE FROM workflow_published_version WHERE workflowId = ?", (workflow_id,))
cursor.execute("DELETE FROM webhook_entity WHERE workflowId = ?", (workflow_id,))
cursor.execute("DELETE FROM webhook_entity WHERE webhookPath = 'wa-inbound'")

# Get existing version info if possible or generate new
version_id = str(uuid.uuid4())

# Data
nodes_str = json.dumps(workflow['nodes'])
connections_str = json.dumps(workflow['connections'])
settings_str = json.dumps(workflow.get('settings', {}))

# Insert Workflow Entity
cursor.execute("""
    INSERT INTO workflow_entity (id, name, active, nodes, connections, settings, versionId, activeVersionId, versionCounter)
    VALUES (?, ?, 1, ?, ?, ?, ?, ?, 1)
""", (workflow_id, 'CRM Cannabis - bot', nodes_str, connections_str, settings_str, version_id, version_id))

# Insert Ownership
cursor.execute("""
    INSERT INTO shared_workflow (workflowId, projectId, role)
    VALUES (?, ?, 'workflow:owner')
""", (workflow_id, project_id))

# Insert Published Version
cursor.execute("""
    INSERT INTO workflow_published_version (workflowId, publishedVersionId)
    VALUES (?, ?)
""", (workflow_id, version_id))

# Insert Webhook Entity
cursor.execute("""
    INSERT INTO webhook_entity (workflowId, webhookId, method, webhookPath, node, pathLength)
    VALUES (?, ?, 'POST', 'wa-inbound', 'Webhook WhatsApp', 10)
""", (workflow_id, webhook_id))

# Deactivate the Sale workflow
cursor.execute("UPDATE workflow_entity SET active = 0 WHERE id = 'scpZdPe5Cp4MG98G'")

conn.commit()
conn.close()
print('Python: Pure insertion finished successfully.')
        `;

        console.log('Pushing python script...');
        await ssh.execCommand(`cat > /tmp/insert_pure.py << 'EOF'\n${pythonInserter}\nEOF`);

        console.log('Running python bridge...');
        const res = await ssh.execCommand('python3 /tmp/insert_pure.py');
        console.log('Python output:', res.stdout);
        if (res.stderr) console.error('Python stderr:', res.stderr);

        // 3. Cleanup
        await ssh.execCommand('rm /tmp/bot_pure.json /tmp/insert_pure.py');

        // 4. Restart n8n
        console.log('Restarting n8n...');
        await ssh.execCommand('pm2 restart n8n-service');

        console.log('--- Pure Restoration Complete ---');
        ssh.dispose();
    } catch (err) {
        console.error('Restoration failed:', err.message);
    }
}

pureRestoration();
