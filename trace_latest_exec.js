const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function traceLatest() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        // Get the latest PM2 log
        const pm2Res = await ssh.execCommand('pm2 logs whatsapp-bot --lines 50 --nostream');
        console.log("=== LATEST PM2 LOGS ===");
        console.log(pm2Res.stdout);

        // Get the latest exec ID from SQLite
        const sqliteRes = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, startedAt FROM execution_entity ORDER BY startedAt DESC LIMIT 3;"');
        console.log("\\n=== LATEST EXECUTIONS ===");
        console.log(sqliteRes.stdout);
        
        let latestId = sqliteRes.stdout.split('|')[0].trim();
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
