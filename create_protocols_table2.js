// Create core_protocols table by injecting a temporary SQL execution node
const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function createCoreProtocolsTable() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log("Preparing payload...");
    
    // Using Python to update both workflow_entity and workflow_published_version safely
    // 1. Download active nodes
    const pyDownloader = `
import sqlite3
import json

try:
    conn = sqlite3.connect('/root/.n8n/database.sqlite')
    c = conn.cursor()
    c.execute("SELECT nodes, connections FROM workflow_entity WHERE id = 'scpZdPe5Cp4MG98G'")
    row = c.fetchone()
    if row:
        with open('/tmp/nodes.json', 'w') as f:
            f.write(row[0])
        with open('/tmp/connections.json', 'w') as f:
            f.write(row[1])
        print("DOWN_OK")
    else:
        print("NOT FOUND")
except Exception as e:
    print(f"Error: {e}")
`;
    await ssh.execCommand(`cat > /tmp/dl.py << 'EOF'\n${pyDownloader}\nEOF`);
    const dlRes = await ssh.execCommand('python3 /tmp/dl.py', { cwd: '/root' });
    if (!dlRes.stdout.includes("DOWN_OK")) {
        console.error("Downloader failed:", dlRes.stdout);
        ssh.dispose();
        return;
    }

    await ssh.getFile('wf_nodes.json', '/tmp/nodes.json');
    await ssh.getFile('wf_connections.json', '/tmp/connections.json');

    let nodes = JSON.parse(fs.readFileSync('wf_nodes.json', 'utf8'));
    let connections = JSON.parse(fs.readFileSync('wf_connections.json', 'utf8'));

    // Remove old wrappers
    nodes = nodes.filter(n => !['temp-webhook-sql', 'temp-pg-ddl'].includes(n.id));
    if (connections["DDL Webhook"]) delete connections["DDL Webhook"];

    const webhookNode = {
        "parameters": { "path": "create-protocols-table", "responseMode": "onReceived", "options": {} },
        "id": "temp-webhook-sql",
        "name": "DDL Webhook",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 2,
        "position": [200, -200]
    };

    const pgNode = {
        "parameters": {
            "operation": "executeQuery",
            "query": "CREATE TABLE IF NOT EXISTS public.core_protocols (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, title TEXT NOT NULL, stage TEXT, topic TEXT, content TEXT, created_at TIMESTAMPTZ DEFAULT now());"
        },
        "id": "temp-pg-ddl",
        "name": "DDL Execute",
        "type": "n8n-nodes-base.postgres",
        "typeVersion": 2.5,
        "credentials": { "postgres": { "id": "yfBYokjK02D81bok", "name": "Postgres account" } },
        "position": [400, -200]
    };

    nodes.push(webhookNode, pgNode);
    connections["DDL Webhook"] = { "main": [[{ "node": "DDL Execute", "type": "main", "index": 0 }]] };

    fs.writeFileSync('wf_nodes_patch.json', JSON.stringify(nodes));
    fs.writeFileSync('wf_conns_patch.json', JSON.stringify(connections));

    await ssh.putFile('wf_nodes_patch.json', '/tmp/nodes_p.json');
    await ssh.putFile('wf_conns_patch.json', '/tmp/conns_p.json');

    const pyUploader = `
import sqlite3
import json

try:
    with open('/tmp/nodes_p.json', 'r') as f:
        nodes = f.read()
    with open('/tmp/conns_p.json', 'r') as f:
        conns = f.read()
    
    conn = sqlite3.connect('/root/.n8n/database.sqlite')
    c = conn.cursor()
    c.execute("UPDATE workflow_entity SET nodes = ?, connections = ? WHERE id = 'scpZdPe5Cp4MG98G'", (nodes, conns))
    c.execute("UPDATE workflow_published_version SET nodes = ?, connections = ? WHERE workflowId = 'scpZdPe5Cp4MG98G'", (nodes, conns))
    conn.commit()
    print("UP_OK")
except Exception as e:
    print(f"Error: {e}")
`;
    await ssh.execCommand(`cat > /tmp/up.py << 'EOF'\n${pyUploader}\nEOF`);
    const upRes = await ssh.execCommand('python3 /tmp/up.py', { cwd: '/root' });
    console.log("Uploader:", upRes.stdout);

    console.log('Restarting PM2 to apply temporary DB DDL nodes...');
    await ssh.execCommand('pm2 restart n8n-service');

    console.log('Waiting 15s for n8n to restart...');
    await new Promise(r => setTimeout(r, 15000));

    // Trigger the DDL webhook
    console.log('Triggering CREATE TABLE via N8N webhook...');
    const fetch = require('node-fetch');
    try {
        const res = await fetch('http://109.199.99.126:5678/webhook/create-protocols-table', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        console.log('DDL webhook status:', res.status);
        const text = await res.text();
        console.log('DDL response:', text.substring(0, 300));
    } catch (e) {
        console.error('Webhook call failed:', e.message);
    }

    // Now clean up
    console.log('Cleaning up temporary DDL nodes...');
    nodes = nodes.filter(n => !['temp-webhook-sql', 'temp-pg-ddl'].includes(n.id));
    if (connections["DDL Webhook"]) delete connections["DDL Webhook"];
    
    fs.writeFileSync('wf_nodes_clean.json', JSON.stringify(nodes));
    fs.writeFileSync('wf_conns_clean.json', JSON.stringify(connections));
    
    await ssh.putFile('wf_nodes_clean.json', '/tmp/nodes_c.json');
    await ssh.putFile('wf_conns_clean.json', '/tmp/conns_c.json');
    
    const pyCleaner = `
import sqlite3
import json

try:
    with open('/tmp/nodes_c.json', 'r') as f:
        nodes = f.read()
    with open('/tmp/conns_c.json', 'r') as f:
        conns = f.read()
    
    conn = sqlite3.connect('/root/.n8n/database.sqlite')
    c = conn.cursor()
    c.execute("UPDATE workflow_entity SET nodes = ?, connections = ? WHERE id = 'scpZdPe5Cp4MG98G'", (nodes, conns))
    c.execute("UPDATE workflow_published_version SET nodes = ?, connections = ? WHERE workflowId = 'scpZdPe5Cp4MG98G'", (nodes, conns))
    conn.commit()
    print("CLEAN_OK")
except Exception as e:
    print(f"Error: {e}")
`;
    await ssh.execCommand(`cat > /tmp/clean.py << 'EOF'\n${pyCleaner}\nEOF`);
    await ssh.execCommand('python3 /tmp/clean.py', { cwd: '/root' });
    
    console.log('Restarting PM2 once more to final clean workflow...');
    await ssh.execCommand('pm2 restart n8n-service');
    // We don't need to wait after cleanup
    console.log('Finished Table Creation workflow.');

    ssh.dispose();
}

createCoreProtocolsTable().catch(console.error);
