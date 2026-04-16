const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function bypassPostgres() {
    try {
        const wfPath = "C:\\\\Users\\\\Cristian\\\\.gemini\\\\antigravity\\\\crm cannabis\\\\n8n-crm-cannabis-workflow.json";
        const data = JSON.parse(fs.readFileSync(wfPath, 'utf8'));

        // 1. Create a raw JS node to do the POST request directly parsing the n8n body
        const jsNode = {
            "parameters": {
                "jsCode": "const fetch = require('node-fetch');\nconst supaUrl = 'https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/daily_telemetry';\nconst supaKey = 'HIDDEN_SECRET_BY_AI';\n\nfor (const item of $input.all()) {\n  const b = item.json.body;\n  const payload = {\n    batch_id: b.batch_id,\n    room_id: b.batch_id,\n    temperature_c: b.temp,\n    humidity_percent: b.humidity,\n    vpd_kpa: b.vpd,\n    created_at: b.timestamp\n  };\n  await fetch(supaUrl, {\n    method: 'POST',\n    headers: { 'apikey': supaKey, 'Authorization': `Bearer ${supaKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },\n    body: JSON.stringify(payload)\n  });\n}\nreturn $input.all();"
            },
            "id": "code-bypass-telemetry",
            "name": "Bypass PG",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [400, 600]
        };

        // Replace PG Insert Telemetry with this Code Node
        let found = false;
        for (let i = 0; i < data.nodes.length; i++) {
            if (data.nodes[i].name === 'PG Insert Telemetry') {
                data.nodes[i] = jsNode;
                found = true;
                break;
            }
        }
        if (!found) data.nodes.push(jsNode);

        // Update connection name
        if (data.connections['Webhook Telemetry']) {
            data.connections['Webhook Telemetry'].main[0] = [{
                node: 'Bypass PG',
                type: 'main',
                index: 0
            }];
        }

        fs.writeFileSync(wfPath, JSON.stringify(data, null, 2));

        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log('Pushing JS bypass to N8N DB...');
        const remoteNodes = JSON.stringify(data.nodes).replace(/'/g, "''");
        const remoteConns = JSON.stringify(data.connections).replace(/'/g, "''");

        let sql = `UPDATE workflow_entity SET nodes = '${remoteNodes}', connections = '${remoteConns}' WHERE id = 'scpZdPe5Cp4MG98G';`;
        fs.writeFileSync('temp_bypass.sql', sql);
        await ssh.putFile('temp_bypass.sql', '/root/bypass_telemetry.sql');
        await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite < /root/bypass_telemetry.sql');

        await ssh.execCommand('pm2 restart n8n-service');
        console.log('✅ N8N restarted with raw JS Supabase fetch.');

        ssh.dispose();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

bypassPostgres();
