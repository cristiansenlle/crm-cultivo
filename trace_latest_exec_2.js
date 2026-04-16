const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function traceLatest() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        // Get the latest exec ID from SQLite, but ONLY failed ones? No, let's get the absolute latest.
        const sqliteRes = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, startedAt, stoppedAt FROM execution_entity ORDER BY startedAt DESC LIMIT 3;"');
        console.log("\\n=== LATEST EXECUTIONS ===");
        console.log(sqliteRes.stdout);
        
        // Split by lines and take the first ID
        const lines = sqliteRes.stdout.trim().split('\\n');
        let latestId = lines[0].split('|')[0].trim();
        
        if(latestId) {
             console.log("\\n=== DUMPING EXECUTION " + latestId + " ===");
             const bashScript = `#!/bin/bash
sqlite3 /root/.n8n/database.sqlite "SELECT data FROM execution_entity WHERE id='${latestId}';" > /tmp/exec_latest.json
        `;
             await ssh.execCommand('cat > /tmp/dump_latest.sh', { stdin: bashScript });
             await ssh.execCommand('chmod +x /tmp/dump_latest.sh');
             await ssh.execCommand('/tmp/dump_latest.sh');
             await ssh.getFile('exec_latest.json', '/tmp/exec_latest.json');
             console.log("Downloaded exec_latest.json.");
        }

        ssh.dispose();
    } catch(e) {
        console.error(e);
        if (ssh) ssh.dispose();
    }
}
traceLatest();
