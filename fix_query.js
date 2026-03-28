const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function fixQuery() {
    try {
        // Read local backup workflow
        const wfPath = "C:\\\\Users\\\\Cristian\\\\.gemini\\\\antigravity\\\\crm cannabis\\\\n8n-crm-cannabis-workflow.json";
        const data = JSON.parse(fs.readFileSync(wfPath, 'utf8'));

        // Fix PG Insert Telemetry Query
        data.nodes.forEach(n => {
            if (n.name === 'PG Insert Telemetry') {
                n.parameters.query = "=INSERT INTO daily_telemetry (batch_id, room_id, temperature_c, humidity_percent, vpd_kpa, created_at) VALUES ('{{$json.body.batch_id}}', '{{$json.body.batch_id}}', {{$json.body.temp}}, {{$json.body.humidity}}, {{$json.body.vpd}}, '{{$json.body.timestamp}}') RETURNING id;";
            }
        });

        fs.writeFileSync(wfPath, JSON.stringify(data, null, 2));

        // Push to server database directly
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log('Pushing patched query workflow to N8N DB...');
        const remoteData = JSON.stringify(data.nodes).replace(/'/g, "''");

        const sql = `UPDATE workflow_entity SET nodes = '${remoteData}' WHERE id = 'scpZdPe5Cp4MG98G';`;
        fs.writeFileSync('temp_query.sql', sql);

        await ssh.putFile('temp_query.sql', '/root/query_telemetry.sql');
        const updateRes = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite < /root/query_telemetry.sql');
        if (updateRes.stderr) console.error('SQL Error:', updateRes.stderr);

        const restart = await ssh.execCommand('pm2 restart n8n-service');
        console.log('✅ N8N restarted with patched query.');

        ssh.dispose();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

fixQuery();
