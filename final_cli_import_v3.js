const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
        
        console.log('--- Final CLI Import (Fixed + Upload) ---');
        console.log('1. Uploading file...');
        await ssh.putFile('wf_final_import.json', '/opt/crm-cannabis/wf_final_import.json');
        
        console.log('2. Importing workflow via CLI...');
        const importRes = await ssh.execCommand('n8n import:workflow --input=/opt/crm-cannabis/wf_final_import.json');
        console.log('Import Result:', importRes.stdout);
        if (importRes.stderr) console.log('Import Stderr:', importRes.stderr);

        console.log('3. Explicitly activating workflow in DB...');
        await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"UPDATE workflow_entity SET active = 1 WHERE id = 'scpZdPe5Cp4MG98G';\"");
        
        console.log('4. Restarting PM2...');
        await ssh.execCommand('pm2 restart n8n-service');
        
        console.log('Done.');
        ssh.dispose();
    } catch (err) {
        console.error('Final import failed:', err.message);
    }
})();
