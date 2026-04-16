const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function execCmdBypass() {
    try {
        const wfPath = "C:\\\\Users\\\\Cristian\\\\.gemini\\\\antigravity\\\\crm cannabis\\\\n8n-crm-cannabis-workflow.json";
        const data = JSON.parse(fs.readFileSync(wfPath, 'utf8'));

        // Create an Execute Command Node
        const execNode = {
            "parameters": {
                "command": `node -e "const fetch = require('node-fetch'); const q = { batch_id: '{{$json.body.batch_id}}', room_id: '{{$json.body.batch_id}}', temperature_c: {{$json.body.temp}}, humidity_percent: {{$json.body.humidity}}, vpd_kpa: {{$json.body.vpd}}, created_at: '{{$json.body.timestamp}}' }; fetch('https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/daily_telemetry', { method: 'POST', headers: { 'apikey': 'HIDDEN_SECRET_BY_AI', 'Authorization': 'Bearer HIDDEN_SECRET_BY_AI', 'Content-Type': 'application/json' }, body: JSON.stringify(q) }).then(r => console.log(r.status));"`
            },
            "id": "exec-bypass-telemetry",
            "name": "Bypass PG",
            "type": "n8n-nodes-base.executeCommand",
            "typeVersion": 1,
            "position": [400, 600]
        };

        // Replace the existing JS bypass node with the Exec Bypass node
        for (let i = 0; i < data.nodes.length; i++) {
            if (data.nodes[i].name === 'Bypass PG') {
                data.nodes[i] = execNode;
                break;
            }
        }

        fs.writeFileSync(wfPath, JSON.stringify(data, null, 2));

        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const remoteNodes = JSON.stringify(data.nodes).replace(/'/g, "''");
        let sql = `UPDATE workflow_entity SET nodes = '${remoteNodes}' WHERE id = 'scpZdPe5Cp4MG98G';`;
        fs.writeFileSync('temp_bypass_exec.sql', sql);
        await ssh.putFile('temp_bypass_exec.sql', '/root/bypass_telemetry_exec.sql');
        await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite < /root/bypass_telemetry_exec.sql');

        await ssh.execCommand('pm2 restart n8n-service');
        console.log('✅ N8N restarted with Execute Command node bypass.');

        ssh.dispose();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

execCmdBypass();
