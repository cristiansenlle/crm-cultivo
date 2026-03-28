const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
        
        console.log('--- FINAL RESTART AND VERIFY ---');
        
        console.log('Restarting n8n-service...');
        await ssh.execCommand('pm2 restart n8n-service');
        
        console.log('Waiting 15s for service initialization...');
        await new Promise(r => setTimeout(r, 15000));
        
        console.log('Querying webhook_entity table...');
        const res = await ssh.execCommand("sqlite3 -json /root/.n8n/database.sqlite 'SELECT * FROM webhook_entity;'");
        console.log('Webhooks Found:', res.stdout || 'NONE');
        
        console.log('Checking PM2 Logs for activation errors...');
        const logs = await ssh.execCommand('pm2 logs n8n-service --lines 30 --nostream');
        console.log('Latest Logs:\n', logs.stdout);

        ssh.dispose();
    } catch (err) {
        console.error('Operation failed:', err.message);
    }
})();
