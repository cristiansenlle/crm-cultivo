const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function enableNode() {
    try {
        // Read local backup workflow
        const wfPath = "C:\\\\Users\\\\Cristian\\\\.gemini\\\\antigravity\\\\crm cannabis\\\\n8n-crm-cannabis-workflow.json";
        const data = JSON.parse(fs.readFileSync(wfPath, 'utf8'));

        // 1. Enable PG Insert Telemetry
        let modified = 0;
        data.nodes.forEach(n => {
            if (n.name === 'PG Insert Telemetry') {
                if (n.disabled === true) {
                    delete n.disabled;
                    modified++;
                }
            }
        });

        if (modified === 0) {
            console.log('Node was not disabled in local JSON.');
        } else {
            fs.writeFileSync(wfPath, JSON.stringify(data, null, 2));
            console.log('✅ Enabled node locally.');
        }

        // 2. Push to server database directly
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log('Pushing updated workflow to N8N DB...');
        const remoteData = JSON.stringify(data.nodes).replace(/'/g, "''");

        // We update workflow scpZdPe5Cp4MG98G directly
        const sql = `UPDATE workflow_entity SET nodes = '${remoteData}' WHERE id = 'scpZdPe5Cp4MG98G';`;
        fs.writeFileSync('temp_sql.sql', sql);

        await ssh.putFile('temp_sql.sql', '/root/enable_telemetry.sql');
        const updateRes = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite < /root/enable_telemetry.sql');
        if (updateRes.stderr) console.error('SQL Error:', updateRes.stderr);

        const restart = await ssh.execCommand('pm2 restart n8n-service');
        console.log('✅ N8N restarted with enabled node.');

        ssh.dispose();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

enableNode();
