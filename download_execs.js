const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function getExecution() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        // Save on server first
        await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT data FROM execution_entity WHERE id='78';\" > /tmp/exec_78.json");
        await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT data FROM execution_entity WHERE id='82';\" > /tmp/exec_82.json");

        // Download
        await ssh.getFile('exec_78.json', '/tmp/exec_78.json');
        await ssh.getFile('exec_82.json', '/tmp/exec_82.json');

        console.log("Downloaded exec_78.json and exec_82.json");

        ssh.dispose();
    } catch(e) {
        console.error(e);
        ssh.dispose();
    }
}
getExecution();
