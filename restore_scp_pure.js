const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function restoreScp() {
    try {
        const localPath = 'c:\\Users\\Cristian\\.gemini\\antigravity\\crm cannabis\\n8n-crm-cannabis-workflow.json';
        const workflowJson = fs.readFileSync(localPath, 'utf8');
        
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'HIDDEN_SECRET_BY_AI' 
        });

        const db = '/root/.n8n/database.sqlite';
        const workflowId = 'scpZdPe5Cp4MG98G';
        const projectId = 'ziw8VANNdEGr5wY3';
        const webhookId = 'd6aa2cb3-abb0-42bf-988b-01da76a1a69e'; // WhatsApp Webhook ID from JSON

        console.log(`--- Restoring Main Workflow ${workflowId} ---`);

        // 1. Upload JSON
        console.log('Uploading JSON via putFile...');
        await ssh.putFile(localPath, '/tmp/scp_pure.json');

        // 2. Python Inserter
        const pythonInserter = `
import sqlite3
import json
import uuid

db_path = '${db}'
workflow_id = '${workflowId}'
project_id = '${projectId}'
webhook_id = '${webhookId}'

with open('/tmp/scp_pure.json', 'r', encoding='utf-8') as f:
    workflow = json.load(f)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Clear everything for BOTH IDs to start fresh
cursor.execute("DELETE FROM workflow_entity WHERE id IN ('scpZdPe5Cp4MG98G', 'yC1ekEMc12CkBmwH')")
cursor.execute("DELETE FROM shared_workflow WHERE workflowId IN ('scpZdPe5Cp4MG98G', 'yC1ekEMc12CkBmwH')")
cursor.execute("DELETE FROM workflow_published_version WHERE workflowId IN ('scpZdPe5Cp4MG98G', 'yC1ekEMc12CkBmwH')")
cursor.execute("DELETE FROM workflow_history WHERE workflowId IN ('scpZdPe5Cp4MG98G', 'yC1ekEMc12CkBmwH')")
cursor.execute("DELETE FROM webhook_entity WHERE workflowId IN ('scpZdPe5Cp4MG98G', 'yC1ekEMc12CkBmwH')")
cursor.execute("DELETE FROM webhook_entity WHERE webhookPath = 'wa-inbound'")

# 2. Preparation (Fixing Credentials & Resilience)
version_id = str(uuid.uuid4())
nodes = workflow['nodes']
connections = workflow['connections']

# Credential Mappings
cred_map = {
    'openRouterApi': 'CN5018CsgxQLJts8',
    'groqApi': 'relM2SypDqndJWK2',
    'postgres': 'yfBYokjK02D81bok',
    'googleCalendarOAuth2Api': 'HKIwYYRVdjmy3V0a'
}

for node in nodes:
    if 'credentials' in node:
        for cred_type in node['credentials']:
            if cred_type in cred_map:
                node['credentials'][cred_type]['id'] = cred_map[cred_type]

# Resilience: Connect Groq Error Port to Format WA Response
if 'AI Agent (Groq Fallback)' in connections:
    c = connections['AI Agent (Groq Fallback)']
    if 'main' in c and len(c['main']) < 2:
        c['main'].append([{
            "node": "Format WA Response",
            "type": "main",
            "index": 0
        }])

nodes_str = json.dumps(nodes)
connections_str = json.dumps(connections)
settings_str = json.dumps(workflow.get('settings', {}))

# 3. Insert Workflow History (CRITICAL for n8n 1.0+)
cursor.execute("""
    INSERT INTO workflow_history (versionId, workflowId, authors, nodes, connections, name)
    VALUES (?, ?, '[]', ?, ?, ?)
""", (version_id, workflow_id, nodes_str, connections_str, 'CRM Cannabis'))

# 4. Insert Workflow Entity (Active)
cursor.execute("""
    INSERT INTO workflow_entity (id, name, active, nodes, connections, settings, versionId, activeVersionId, versionCounter)
    VALUES (?, ?, 1, ?, ?, ?, ?, ?, 1)
""", (workflow_id, 'CRM Cannabis', nodes_str, connections_str, settings_str, version_id, version_id))

cursor.execute("""
    INSERT INTO shared_workflow (workflowId, projectId, role)
    VALUES (?, ?, 'workflow:owner')
""", (workflow_id, project_id))

cursor.execute("""
    INSERT INTO workflow_published_version (workflowId, publishedVersionId)
    VALUES (?, ?)
""", (workflow_id, version_id))

# 3. Register ALL webhooks found in nodes
for node in workflow['nodes']:
    if node['type'] == 'n8n-nodes-base.webhook':
        path = node['parameters'].get('path', '')
        method = node['parameters'].get('httpMethod', 'GET')
        name = node['name']
        w_id = node.get('webhookId', str(uuid.uuid4()))
        if path:
            print(f'Registering webhook: {path} ({method}) for node {name}')
            cursor.execute("""
                INSERT INTO webhook_entity (workflowId, webhookId, method, webhookPath, node, pathLength)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (workflow_id, w_id, method, path, name, len(path)))

conn.commit()
conn.close()
print('Python: Restoration of scp successful.')
        `;

        await ssh.execCommand(`cat > /tmp/restore_scp.py << 'EOF'\n${pythonInserter}\nEOF`);
        const res = await ssh.execCommand('python3 /tmp/restore_scp.py');
        console.log(res.stdout);
        if (res.stderr) console.error(res.stderr);

        // 3. Restart
        console.log('Restarting n8n...');
        await ssh.execCommand('pm2 restart n8n-service');

        ssh.dispose();
    } catch (err) {
        console.error('Restoration failed:', err.message);
    }
}

restoreScp();
