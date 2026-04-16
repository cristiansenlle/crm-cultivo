const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const path = require('path');

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
        console.log('--- Step 1: Uploading JSON ---');
        const localPath = path.join(__dirname, 'wf_definitive_restoration.json');
        const remotePath = '/opt/crm-cannabis/wf_definitive.json';
        await ssh.putFile(localPath, remotePath);
        console.log('Upload successful.');
        ssh.dispose();
    } catch (err) {
        console.error('Upload failed:', err.message);
    }
})();
