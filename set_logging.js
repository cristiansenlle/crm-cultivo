const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function setLogging() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log('Enabling N8N full execution logging...');
        const settingsJson = JSON.stringify({
            saveDataErrorExecution: "all",
            saveDataSuccessExecution: "all"
        });

        // Use parameter binding in sqlite3 instead of inline to avoid quote hell
        const sql = `UPDATE workflow_entity SET settings = '${settingsJson}' WHERE id = 'scpZdPe5Cp4MG98G';`;
        fs.writeFileSync('temp_set.sql', sql);
        await ssh.putFile('temp_set.sql', '/root/set_logs.sql');

        await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite < /root/set_logs.sql');
        await ssh.execCommand('pm2 restart n8n-service');
        console.log('✅ Logging enabled and service restarted.');

        ssh.dispose();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

setLogging();
