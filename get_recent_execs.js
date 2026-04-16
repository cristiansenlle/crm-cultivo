const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function getExecs() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const bashScript = `#!/bin/bash
sqlite3 /root/.n8n/database.sqlite "SELECT data FROM execution_entity WHERE id='100';" > /tmp/exec100.json
sqlite3 /root/.n8n/database.sqlite "SELECT data FROM execution_entity WHERE id='99';" > /tmp/exec99.json
sqlite3 /root/.n8n/database.sqlite "SELECT data FROM execution_entity WHERE id='98';" > /tmp/exec98.json
sqlite3 /root/.n8n/database.sqlite "SELECT data FROM execution_entity WHERE id='97';" > /tmp/exec97.json
sqlite3 /root/.n8n/database.sqlite "SELECT data FROM execution_entity WHERE id='96';" > /tmp/exec96.json
        `;
        await ssh.execCommand('cat > /tmp/dump_execs.sh', { stdin: bashScript });
        await ssh.execCommand('chmod +x /tmp/dump_execs.sh');
        await ssh.execCommand('/tmp/dump_execs.sh');

        for (let i of [100, 99, 98, 97, 96]) {
            try {
                await ssh.getFile(`exec${i}.json`, `/tmp/exec${i}.json`);
                console.log(`Downloaded exec${i}.json`);
            } catch(e) {}
        }

        ssh.dispose();
    } catch(e) {
        console.error(e);
        if (ssh) ssh.dispose();
    }
}
getExecs();
