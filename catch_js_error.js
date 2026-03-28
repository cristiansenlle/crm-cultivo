const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function catchJsError() {
    try {
        const wfPath = "C:\\\\Users\\\\Cristian\\\\.gemini\\\\antigravity\\\\crm cannabis\\\\n8n-crm-cannabis-workflow.json";
        const data = JSON.parse(fs.readFileSync(wfPath, 'utf8'));

        // Modify JS Node to try/catch
        for (let i = 0; i < data.nodes.length; i++) {
            if (data.nodes[i].name === 'Bypass PG') {
                data.nodes[i].parameters.jsCode = `const fetch = require('node-fetch');
const supaUrl = 'https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/daily_telemetry';
const supaKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8';

for (const item of $input.all()) {
  try {
      const b = item.json.body;
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
      item.json.my_supa_status = res.status;
      item.json.my_supa_resp = await res.text();
  } catch (err) {
      item.json.my_supa_error = err.message;
  }
}
return $input.all();`;
            }
        }

        fs.writeFileSync(wfPath, JSON.stringify(data, null, 2));

        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        const remoteNodes = JSON.stringify(data.nodes).replace(/'/g, "''");
        let sql = `UPDATE workflow_entity SET nodes = '${remoteNodes}' WHERE id = 'scpZdPe5Cp4MG98G';`;
        fs.writeFileSync('temp_bypass_err.sql', sql);
        await ssh.putFile('temp_bypass_err.sql', '/root/bypass_telemetry_err.sql');
        await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite < /root/bypass_telemetry_err.sql');

        await ssh.execCommand('pm2 restart n8n-service');
        console.log('✅ N8N restarted with try/catch JS Supabase fetch.');

        ssh.dispose();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

catchJsError();
