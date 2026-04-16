const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
        
        console.log('--- Deep Remediation ---');
        
        console.log('1. Stopping n8n service...');
        await ssh.execCommand('pm2 stop n8n-service');
        
        console.log('2. Removing ALL database files including WAL/SHM...');
        await ssh.execCommand('rm -f /root/.n8n/database.sqlite*');
        
        console.log('3. Restoring clean backup from stabilize_v2...');
        // Note: stabilize_v2 was confirmed healthy previously.
        await ssh.execCommand('cp /opt/crm-cannabis/recovery_db_stabilize_v2.sqlite /root/.n8n/database.sqlite');
        
        console.log('4. Starting n8n service...');
        await ssh.execCommand('pm2 start n8n-service');
        
        console.log('5. Waiting for boot...');
        await new Promise(r => setTimeout(r, 5000));
        
        console.log('6. Checking logs for corruption...');
        const logRes = await ssh.execCommand('pm2 logs n8n-service --lines 20 --nostream');
        console.log(logRes.stdout);
        
        ssh.dispose();
    } catch (err) {
        console.error('Deep remediation failed:', err.message);
    }
})();
