const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function getExecution88() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const bashScript = `#!/bin/bash
sqlite3 /root/.n8n/database.sqlite "SELECT data FROM execution_entity WHERE id='88';" > /tmp/exec_88.json
        `;
        
        await ssh.execCommand('cat > /tmp/dump_88.sh', { stdin: bashScript });
        await ssh.execCommand('chmod +x /tmp/dump_88.sh');
        await ssh.execCommand('/tmp/dump_88.sh');
        
        await ssh.getFile('exec_88.json', '/tmp/exec_88.json');
        console.log("Downloaded exec_88.json.");

        ssh.dispose();
    } catch(e) {
        console.error(e);
        ssh.dispose();
    }
}
getExecution88();
