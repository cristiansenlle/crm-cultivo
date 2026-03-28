const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
        
        console.log('--- Final Activation ---');
        await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "UPDATE workflow_entity SET active = 1 WHERE id = \'scpZdPe5Cp4MG98G\';"');
        
        console.log('Restarting PM2...');
        await ssh.execCommand('pm2 restart n8n-service');
        
        ssh.dispose();
    } catch (err) {
        console.error('Final activation failed:', err.message);
    }
})();
