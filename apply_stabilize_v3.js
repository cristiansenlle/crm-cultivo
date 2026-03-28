const fs = require('fs');
const { NodeSSH } = require('node-ssh');

const ssh = new NodeSSH();

(async () => {
    try {
        const nodes = JSON.parse(fs.readFileSync('nodes_stabilized_v3.json', 'utf8'));
        const hexNodes = Buffer.from(JSON.stringify(nodes)).toString('hex');

        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log('Connected.');

        const sql = `UPDATE workflow_entity SET nodes = X'${hexNodes}' WHERE id = 'scpZdPe5Cp4MG98G';`;
        const localSqlPath = './temp_stabilize_v3.sql';
        fs.writeFileSync(localSqlPath, sql);
        
        const remoteSqlPath = '/opt/crm-cannabis/stabilize_v3.sql';
        await ssh.putFile(localSqlPath, remoteSqlPath);
        console.log('SQL Patch v3 uploaded.');

        const updateRes = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite < ${remoteSqlPath}`);
        if (updateRes.stderr) console.log('SQL Result:', updateRes.stderr);
        console.log('Database updated v3.');

        console.log('Restarting n8n...');
        await ssh.execCommand('pm2 restart n8n-service');
        console.log('Done.');

        ssh.dispose();
        fs.unlinkSync(localSqlPath);
    } catch (err) {
        console.error('Update failed:', err.message);
        process.exit(1);
    }
})();
