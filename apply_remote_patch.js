const fs = require('fs');
const { NodeSSH } = require('node-ssh');

const ssh = new NodeSSH();

(async () => {
    try {
        const nodes = JSON.parse(fs.readFileSync('nodes_room_patched.json', 'utf8'));
        const hexNodes = Buffer.from(JSON.stringify(nodes)).toString('hex');

        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log('Connected to server.');

        // Verify/Create directory
        await ssh.execCommand('mkdir -p /opt/crm-cannabis');

        const sql = `UPDATE workflow_entity SET nodes = X'${hexNodes}' WHERE id = 'scpZdPe5Cp4MG98G';`;
        const localSqlPath = './temp_patch_rooms.sql';
        fs.writeFileSync(localSqlPath, sql);
        
        const remoteSqlPath = '/opt/crm-cannabis/patch_rooms.sql';
        await ssh.putFile(localSqlPath, remoteSqlPath);
        console.log('SQL Patch file uploaded to server.');

        const updateRes = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite < ${remoteSqlPath}`);
        if (updateRes.stderr && !updateRes.stderr.includes('already exists')) {
             console.log('SQL Warning/Error:', updateRes.stderr);
        }
        console.log('Database updated action finished.');

        console.log('Restarting n8n-service...');
        await ssh.execCommand('pm2 restart n8n-service');
        console.log('Done.');

        ssh.dispose();
        fs.unlinkSync(localSqlPath);
    } catch (err) {
        console.error('Update failed:', err.message);
        process.exit(1);
    }
})();
