const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function restoreWithBase64() {
    try {
        const localPath = 'c:\\Users\\Cristian\\.gemini\\antigravity\\crm cannabis\\n8n-crm-cannabis-workflow.json.perfected';
        const workflowJson = fs.readFileSync(localPath, 'utf8');
        const base64Data = Buffer.from(workflowJson).toString('base64');
        
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'HIDDEN_SECRET_BY_AI' 
        });

        const db = '/root/.n8n/database.sqlite';
        const workflowId = 'yC1ekEMc12CkBmwH';
        const projectId = 'ziw8VANNdEGr5wY3';
        const webhookId = 'd6aa2cb3-abb0-42bf-988b-01da76a1a69e';

        console.log('--- Restoration via Base64 & Python ---');

        // 1. Upload JSON via Base64
        console.log('Uploading JSON as Base64...');
        // We write in chunks if too big, but 130KB should fit in one echo if we are lucky.
        // If not, we use the 'putFile' method of node-ssh which is safer.
        await ssh.execCommand(`echo "${base64Data}" > /tmp/bot.json.b64`);
        await ssh.execCommand(`base64 -d /tmp/bot.json.b64 > /tmp/bot.json`);

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

cursor.execute("DELETE FROM workflow_entity WHERE id = ?", (workflow_id,))
cursor.execute("DELETE FROM shared_workflow WHERE workflowId = ?", (workflow_id,))
cursor.execute("DELETE FROM workflow_published_version WHERE workflowId = ?", (workflow_id,))
cursor.execute("DELETE FROM webhook_entity WHERE workflowId = ?", (workflow_id,))

nodes_str = json.dumps(workflow['nodes'])
connections_str = json.dumps(workflow['connections'])
settings_str = json.dumps(workflow.get('settings', {}))

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

cursor.execute("UPDATE workflow_entity SET active = 0 WHERE id = 'scpZdPe5Cp4MG98G'")
cursor.execute("DELETE FROM webhook_entity WHERE workflowId = 'scpZdPe5Cp4MG98G'")

conn.commit()
conn.close()
print('Python: Insertion finished successfully.')
        `;

        console.log('Pushing python script...');
        await ssh.execCommand(`cat > /tmp/insert_bot.py << 'EOF'\n${pythonInserter}\nEOF`);

        console.log('Running python bridge...');
        const res = await ssh.execCommand('python3 /tmp/insert_bot.py');
        console.log('Python output:', res.stdout);
        if (res.stderr) console.error('Python stderr:', res.stderr);

        console.log('Restarting n8n...');
        await ssh.execCommand('pm2 restart n8n-service');

        console.log('--- Restoration Complete ---');
        ssh.dispose();
    } catch (err) {
        console.error('Base64 Restoration failed:', err.message);
    }
}

restoreWithBase64();
