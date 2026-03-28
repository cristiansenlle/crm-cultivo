const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function fixResponseMode() {
    try {
        const wfPath = "C:\\\\Users\\\\Cristian\\\\.gemini\\\\antigravity\\\\crm cannabis\\\\n8n-crm-cannabis-workflow.json";
        const data = JSON.parse(fs.readFileSync(wfPath, 'utf8'));

        // Change Telemetry webhook to wait for last node
        data.nodes.forEach(n => {
            if (n.name === 'Webhook Telemetry') {
                n.parameters.responseMode = 'onReceived';
            }
        });

        fs.writeFileSync(wfPath, JSON.stringify(data, null, 2));

        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log('Pushing responseMode patch to N8N DB...');
        const remoteData = JSON.stringify(data.nodes).replace(/'/g, "''");

        const sql = `UPDATE workflow_entity SET nodes = '${remoteData}' WHERE id = 'scpZdPe5Cp4MG98G';`;
        fs.writeFileSync('temp_resp.sql', sql);
        await ssh.putFile('temp_resp.sql', '/root/resp_telemetry.sql');
        await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite < /root/resp_telemetry.sql');

        await ssh.execCommand('pm2 restart n8n-service');
        console.log('✅ N8N restarted with onReceived mode.');

        ssh.dispose();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

fixResponseMode();
