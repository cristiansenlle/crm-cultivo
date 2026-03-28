// Create core_rooms table by injecting a temporary SQL execution node into the N8N workflow
const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function createCoreRoomsTable() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    // Read the current workflow JSON
    const wfRaw = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "SELECT nodes, connections FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';"`);
    const parts = wfRaw.stdout.split('|');

    let nodes = JSON.parse(parts[0]);
    let connections = JSON.parse(parts[1]);

    // Create a webhook + postgres execute pair to run our DDL
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
            "query": `CREATE TABLE IF NOT EXISTS public.core_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phase TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.core_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow anon read" ON public.core_rooms FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon insert" ON public.core_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow anon update" ON public.core_rooms FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon delete" ON public.core_rooms FOR DELETE USING (true);`
        },
        "id": "temp-pg-ddl",
        "name": "DDL Execute",
        "type": "n8n-nodes-base.postgres",
        "typeVersion": 2.5,
        "credentials": { "postgres": { "id": "yfBYokjK02D81bok", "name": "Postgres account" } },
        "position": [400, 800]
    };

    // Remove any previous temp nodes
    nodes = nodes.filter(n => n.id !== 'temp-webhook-sql' && n.id !== 'temp-pg-ddl');
    nodes.push(webhookNode, pgNode);

    // Wire them
    connections["DDL Webhook"] = { "main": [[{ "node": "DDL Execute", "type": "main", "index": 0 }]] };

    const nodesSql = JSON.stringify(nodes).replace(/'/g, "''");
    const connsSql = JSON.stringify(connections).replace(/'/g, "''");
    const sql = `UPDATE workflow_entity SET nodes = '${nodesSql}', connections = '${connsSql}' WHERE id = 'scpZdPe5Cp4MG98G';`;

    fs.writeFileSync('/tmp/add_ddl_node.sql', sql);
    await ssh.putFile('/tmp/add_ddl_node.sql', '/root/add_ddl_node.sql');
    await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite < /root/add_ddl_node.sql');
    await ssh.execCommand('pm2 restart n8n-service');

    console.log('Waiting for n8n restart...');
    await new Promise(r => setTimeout(r, 4000));

    // Trigger the DDL webhook
    console.log('Triggering CREATE TABLE via N8N webhook...');
    const fetch = require('node-fetch');
    const res = await fetch('http://109.199.99.126:5678/webhook/create-rooms-table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
    console.log('DDL webhook status:', res.status);
    const text = await res.text();
    console.log('DDL response:', text.substring(0, 200));

    ssh.dispose();
}

createCoreRoomsTable().catch(console.error);
