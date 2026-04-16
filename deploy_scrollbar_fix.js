const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const path = require('path');

(async () => {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const remoteDir = '/opt/crm-cannabis';
        console.log(`Uploading to ${remoteDir}...`);

        console.log('Uploading index.html (scrollbar fix)...');
        await ssh.putFile('c:\\Users\\Cristian\\.gemini\\antigravity\\crm cannabis\\index.html', path.join(remoteDir, 'index.html'));

        console.log('Uploading style.css (scrollbar fix)...');
        await ssh.putFile('c:\\Users\\Cristian\\.gemini\\antigravity\\crm cannabis\\style.css', path.join(remoteDir, 'style.css'));

        console.log('--- Deployment SUCCESSFUL ---');
        process.exit(0);

    } catch (err) {
        console.error('Deployment ERROR:', err);
        process.exit(1);
    }
})();
