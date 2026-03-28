const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

(async () => {
    try {
        const nodes = JSON.parse(fs.readFileSync('nodes_bulletproof_final_v5.json', 'utf8'));
        const hexNodes = Buffer.from(JSON.stringify(nodes)).toString('hex');

        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
        console.log('Connected.');

        // 1. Stop n8n to release SQLite locks
        await ssh.execCommand('pm2 stop n8n-service');
        console.log('n8n stopped.');

        // 2. Prepare and Upload SQL
        const sql = `UPDATE workflow_entity SET nodes = X'${hexNodes}' WHERE id = 'scpZdPe5Cp4MG98G';`;
        fs.writeFileSync('final_v13.sql', sql);
        await ssh.putFile('final_v13.sql', '/opt/crm-cannabis/final_v13.sql');

        // 3. Apply SQL
        await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite < /opt/crm-cannabis/final_v13.sql');
        console.log('SQL Applied.');

        // 4. Start n8n
        await ssh.execCommand('pm2 start n8n-service');
        console.log('n8n started.');

        ssh.dispose();
    } catch (err) {
        console.error('Safe apply failed:', err.message);
    }
})();
