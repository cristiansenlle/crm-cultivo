const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
        
        console.log('--- Existence Test ---');
        console.log('1. Deleting workflow record...');
        await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "DELETE FROM workflow_entity WHERE id = \'scpZdPe5Cp4MG98G\';"');
        
        console.log('2. Restarting n8n...');
        await ssh.execCommand('pm2 restart n8n-service');
        
        console.log('Existence test setup complete.');
        ssh.dispose();
    } catch (err) {
        console.error('Test setup failed:', err.message);
    }
})();
