const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function runSQL() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        const sql = fs.readFileSync('update_wf2.sql', 'utf8');
        console.log('SQL Size:', sql.length, 'bytes');

        // Execute SQL securely via SSH stream
        const cmd = await ssh.execCommand('cat > /tmp/update_wf2.sql', {
            options: {
                pty: false
            },
            stdin: sql
        });

        if (cmd.code !== 0) {
            console.error('Failed to transfer SQL:', cmd.stderr);
            return;
        }

        const res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite < /tmp/update_wf2.sql');
        console.log('SQLite Output:', res.stdout);
        console.log('SQLite Errors:', res.stderr);

        // Verify update
        const ver = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT COUNT(*) FROM workflow_entity WHERE id=\'scpZdPe5Cp4MG98G\' AND nodes LIKE \'%consultar_salas%\';"');
        console.log('Rows matched after update:', ver.stdout);

        ssh.dispose();
    } catch(e) {
        console.error(e);
        if (ssh.isConnected()) ssh.dispose();
    }
}
runSQL();
