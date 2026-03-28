const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

(async () => {
    let report = "# Bot Execution Debug Report\n\n";
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });

        const query = "SELECT e.id, d.data FROM execution_entity e JOIN execution_data d ON e.id = d.executionId WHERE e.workflowId = 'scpZdPe5Cp4MG98G' ORDER BY e.startedAt DESC LIMIT 2;";
        const localPath = './fetch_debug.sql';
        fs.writeFileSync(localPath, query);
        
        const remotePath = '/opt/crm-cannabis/fetch_debug.sql';
        await ssh.putFile(localPath, remotePath);
        
        const res = await ssh.execCommand(`sqlite3 -json /root/.n8n/database.sqlite < ${remotePath}`);
        
        if (!res.stdout) {
            fs.writeFileSync('log_debug.md', "No data stdout.");
            ssh.dispose();
            return;
        }

        const rawData = JSON.parse(res.stdout);
        report += `Found ${rawData.length} rows.\n\n`;

        rawData.forEach((row, idx) => {
            report += `## Row ${idx} (ID: ${row.id})\n`;
            report += "Raw Data Start:\n```json\n" + row.data.substring(0, 2000) + "\n```\n";
        });

        fs.writeFileSync('log_debug.md', report);
        ssh.dispose();
    } catch (err) {
        fs.writeFileSync('log_debug.md', "FAILED: " + err.message);
    }
})();
