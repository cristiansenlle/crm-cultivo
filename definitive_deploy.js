const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const path = require('path');

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
        
        console.log('--- DEFINITIVE DEPLOYMENT ---');
        
        const localPath = path.join(__dirname, 'wf_definitive_restoration.json');
        const remotePath = '/opt/crm-cannabis/wf_definitive.json';
        
        console.log(`Uploading ${localPath} to ${remotePath}...`);
        await ssh.putFile(localPath, remotePath);

        // 1. Import the workflow
        console.log('Running n8n import...');
        const importRes = await ssh.execCommand(`n8n import:workflow --input=${remotePath}`);
        console.log('Import Result:', importRes.stdout || importRes.stderr);

        // 2. Publish/Activate the workflow
        // In n8n v1.x, we use publish:workflow to make it active and persistent
        console.log('Publishing workflow scpZdPe5Cp4MG98G...');
        const publishRes = await ssh.execCommand('n8n publish:workflow --id=scpZdPe5Cp4MG98G');
        console.log('Publish Result:', publishRes.stdout || publishRes.stderr);

        // 3. Restart service to be absolutely sure
        console.log('Restarting n8n-service...');
        await ssh.execCommand('pm2 restart n8n-service');

        console.log('Deployment complete.');
        ssh.dispose();
    } catch (err) {
        console.error('Deployment failed:', err.message);
    }
})();
