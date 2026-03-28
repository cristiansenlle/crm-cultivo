// Create core_rooms table by injecting a temporary SQL execution node
const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function createCoreRoomsTable() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    // Read nodes and connections separately via temp files to avoid pipe issues
    await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';" > /root/wf_nodes.json`);
    await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "SELECT connections FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';" > /root/wf_connections.json`);

    await ssh.getFile('c:\\Users\\Cristian\\.gemini\\antigravity\\crm cannabis\\wf_nodes.json', '/root/wf_nodes.json');
    await ssh.getFile('c:\\Users\\Cristian\\.gemini\\antigravity\\crm cannabis\\wf_connections.json', '/root/wf_connections.json');

    const nodesRaw = fs.readFileSync('wf_nodes.json', 'utf8').trim();
    const connectionsRaw = fs.readFileSync('wf_connections.json', 'utf8').trim();

    let nodes = JSON.parse(nodesRaw);
    let connections = JSON.parse(connectionsRaw);

    // Remove any previous temp nodes
    nodes = nodes.filter(n => !['temp-webhook-sql', 'temp-pg-ddl'].includes(n.id));

    // Create a webhook + postgres execute pair to run our DDL (split into separate statements)
    const webhookNode = {
        "parameters": { "path": "create-rooms-table", "responseMode": "onReceived", "options": {} },
        "id": "temp-webhook-sql",
        "name": "DDL Webhook",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 2,
        "position": [200, 800]
    };

    const pgNode = {
        "parameters": {
            "operation": "executeQuery",
            "query": "CREATE TABLE IF NOT EXISTS public.core_rooms (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, name TEXT NOT NULL, phase TEXT, description TEXT, created_at TIMESTAMPTZ DEFAULT now());"
        },
        "id": "temp-pg-ddl",
        "name": "DDL Execute",
        "type": "n8n-nodes-base.postgres",
        "typeVersion": 2.5,
        "credentials": { "postgres": { "id": "yfBYokjK02D81bok", "name": "Postgres account" } },
        "position": [400, 800]
    };

    nodes.push(webhookNode, pgNode);
    connections["DDL Webhook"] = { "main": [[{ "node": "DDL Execute", "type": "main", "index": 0 }]] };

    const nodesSql = JSON.stringify(nodes).replace(/'/g, "''");
    const connsSql = JSON.stringify(connections).replace(/'/g, "''");

    // Write SQL update to files (avoid shell quoting issues)
    const sqlContent = `UPDATE workflow_entity SET nodes = '${nodesSql}', connections = '${connsSql}' WHERE id = 'scpZdPe5Cp4MG98G';`;
    fs.writeFileSync('wf_ddl_update.sql', sqlContent);
    await ssh.putFile('wf_ddl_update.sql', '/root/wf_ddl_update.sql');

    await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite < /root/wf_ddl_update.sql');
    await ssh.execCommand('pm2 restart n8n-service');

    console.log('Waiting 5s for n8n to restart...');
    await new Promise(r => setTimeout(r, 5000));

    // Trigger the DDL webhook
    console.log('Triggering CREATE TABLE via N8N webhook...');
    const fetch = require('node-fetch');
    try {
        const res = await fetch('http://109.199.99.126:5678/webhook/create-rooms-table', {
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

    ssh.dispose();
}

createCoreRoomsTable().catch(console.error);
