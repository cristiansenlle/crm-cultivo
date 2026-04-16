const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });

        const sql = `
            SELECT 'Entity Count:', count(*) FROM execution_entity;
            SELECT 'Data Count:', count(*) FROM execution_data;
            SELECT 'Recent IDs:', id, startedAt FROM execution_entity ORDER BY startedAt DESC LIMIT 10;
        `;
        const localPath = './check_counts.sql';
        fs.writeFileSync(localPath, sql);
        
        const remotePath = '/opt/crm-cannabis/check_counts.sql';
        await ssh.putFile(localPath, remotePath);
        
        const res = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite < ${remotePath}`);
        console.log(res.stdout);

        ssh.dispose();
        fs.unlinkSync(localPath);
    } catch (err) {
        console.error('Check failed:', err.message);
    }
})();
