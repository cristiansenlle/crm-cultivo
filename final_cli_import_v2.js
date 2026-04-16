const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
        
        console.log('--- Final CLI Import (Fixed) ---');
        console.log('1. Importing workflow via CLI...');
        const importRes = await ssh.execCommand('n8n import:workflow --input=/opt/crm-cannabis/wf_final_import.json');
        console.log('Import Result:', importRes.stdout);

        console.log('2. Explicitly activating workflow in DB...');
        await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"UPDATE workflow_entity SET active = 1 WHERE id = 'scpZdPe5Cp4MG98G';\"");
        
        console.log('3. Restarting PM2...');
        await ssh.execCommand('pm2 restart n8n-service');
        
        console.log('Done.');
        ssh.dispose();
    } catch (err) {
        console.error('Final import failed:', err.message);
    }
})();
