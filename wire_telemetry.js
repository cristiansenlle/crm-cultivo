const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function fixWiring() {
    try {
        // Read local backup workflow
        const wfPath = "C:\\\\Users\\\\Cristian\\\\.gemini\\\\antigravity\\\\crm cannabis\\\\n8n-crm-cannabis-workflow.json";
        const data = JSON.parse(fs.readFileSync(wfPath, 'utf8'));

        // Add connection from Webhook Telemetry to PG Insert Telemetry
        if (!data.connections['Webhook Telemetry']) {
            data.connections['Webhook Telemetry'] = { main: [[]] };
        }

        // Check if it already has the connection
        const hasConn = data.connections['Webhook Telemetry'].main[0].find(c => c.node === 'PG Insert Telemetry');

        if (!hasConn) {
            data.connections['Webhook Telemetry'].main[0].push({
                node: 'PG Insert Telemetry',
                type: 'main',
                index: 0
            });
            fs.writeFileSync(wfPath, JSON.stringify(data, null, 2));
            console.log('✅ Added wiring locally.');
        } else {
            console.log('Connection already existed locally.');
        }

        // Push to server database directly
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log('Pushing wired workflow to N8N DB...');
        const remoteData = JSON.stringify(data.connections).replace(/'/g, "''");

        const sql = `UPDATE workflow_entity SET connections = '${remoteData}' WHERE id = 'scpZdPe5Cp4MG98G';`;
        fs.writeFileSync('temp_wire.sql', sql);

        await ssh.putFile('temp_wire.sql', '/root/wire_telemetry.sql');
        const updateRes = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite < /root/wire_telemetry.sql');
        if (updateRes.stderr) console.error('SQL Error:', updateRes.stderr);

        const restart = await ssh.execCommand('pm2 restart n8n-service');
        console.log('✅ N8N restarted with wired telemetry node.');

        ssh.dispose();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

fixWiring();
