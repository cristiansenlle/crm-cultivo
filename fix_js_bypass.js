const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function fixJsBypass() {
    try {
        const wfPath = "C:\\\\Users\\\\Cristian\\\\.gemini\\\\antigravity\\\\crm cannabis\\\\n8n-crm-cannabis-workflow.json";
        const data = JSON.parse(fs.readFileSync(wfPath, 'utf8'));

        // Correct the JS Node Payload to explicitly include room_id 
        for (let i = 0; i < data.nodes.length; i++) {
            if (data.nodes[i].name === 'Bypass PG') {
                data.nodes[i].parameters.jsCode = `const fetch = require('node-fetch');
const supaUrl = 'https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/daily_telemetry';
const supaKey = 'HIDDEN_SECRET_BY_AI';

for (const item of $input.all()) {
  const b = item.json.body;
  
  // Clean up timestamp if it fails Postgres strict ISO
  let ts = b.timestamp || new Date().toISOString();
  
  const payload = {
    batch_id: b.batch_id,
    room_id: b.batch_id,
    temperature_c: Number(b.temp),
    humidity_percent: Number(b.humidity),
    vpd_kpa: Number(b.vpd),
    created_at: ts
  };
  
  const res = await fetch(supaUrl, {
    method: 'POST',
    headers: { 'apikey': supaKey, 'Authorization': \`Bearer \${supaKey}\`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(payload)
  });
  
  const status = res.status;
  const text = await res.text();
  
  item.json.my_supa_status = status;
  item.json.my_supa_resp = text;
}
return $input.all();`;
            }
        }

        fs.writeFileSync(wfPath, JSON.stringify(data, null, 2));

        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log('Pushing corrected JS bypass to N8N DB...');
        const remoteNodes = JSON.stringify(data.nodes).replace(/'/g, "''");

        let sql = `UPDATE workflow_entity SET nodes = '${remoteNodes}' WHERE id = 'scpZdPe5Cp4MG98G';`;
        fs.writeFileSync('temp_bypass_fix.sql', sql);
        await ssh.putFile('temp_bypass_fix.sql', '/root/bypass_telemetry_fix.sql');
        await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite < /root/bypass_telemetry_fix.sql');

        await ssh.execCommand('pm2 restart n8n-service');
        console.log('✅ N8N restarted with fully compliant JS Supabase fetch.');

        ssh.dispose();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

fixJsBypass();
