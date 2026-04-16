const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function getRecentExecs() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const bashScript = `#!/bin/bash
sqlite3 /root/.n8n/database.sqlite "SELECT id, startedAt, data FROM execution_entity WHERE workflowId='scpZdPe5Cp4MG98G' ORDER BY startedAt DESC LIMIT 3;" > /tmp/recent_execs.txt
        `;
        
        await ssh.execCommand('cat > /tmp/dump_execs.sh', { stdin: bashScript });
        await ssh.execCommand('chmod +x /tmp/dump_execs.sh');
        
        await ssh.execCommand('/tmp/dump_execs.sh');
        await ssh.getFile('recent_execs.txt', '/tmp/recent_execs.txt');
        console.log("Downloaded recent executions.");

        ssh.dispose();
    } catch(e) {
        console.error(e);
        ssh.dispose();
    }
}
getRecentExecs();
