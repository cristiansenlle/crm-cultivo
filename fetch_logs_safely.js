const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function getExecution() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        // Write a small script to the server that queries and saves
        const remoteScript = `
const sqlite3 = require('sqlite3');
const fs = require('fs');

const db = new sqlite3.Database('/root/.n8n/database.sqlite');
db.get("SELECT data FROM execution_entity WHERE id='78'", (err, row) => {
    if(row) fs.writeFileSync('/tmp/exec_78.json', row.data);
});
db.get("SELECT data FROM execution_entity WHERE id='82'", (err, row) => {
    if(row) fs.writeFileSync('/tmp/exec_82.json', row.data);
});
db.close();
        `;
        
        await ssh.execCommand('cat > /tmp/dump.js', { stdin: remoteScript });
        await ssh.execCommand('node /tmp/dump.js');

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
