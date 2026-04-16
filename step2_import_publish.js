const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
        console.log('--- Step 2: Import and Publish ---');
        
        const remotePath = '/opt/crm-cannabis/wf_definitive.json';

        // 1. Import
        console.log('Importing...');
        const importRes = await ssh.execCommand(`n8n import:workflow --input=${remotePath}`);
        console.log('Import Status:', importRes.stdout || importRes.stderr);

        // 2. Publish
        console.log('Publishing...');
        const publishRes = await ssh.execCommand('n8n publish:workflow --id=scpZdPe5Cp4MG98G');
        console.log('Publish Status:', publishRes.stdout || publishRes.stderr);

        // 3. Final DB verification
        console.log('Verifying Webhooks...');
        const verifyRes = await ssh.execCommand("sqlite3 -json /root/.n8n/database.sqlite \"SELECT path FROM webhook_entity;\"");
        console.log('Registered Webhooks:', verifyRes.stdout);

        ssh.dispose();
    } catch (err) {
        console.error('Handshake failed:', err.message);
    }
})();
