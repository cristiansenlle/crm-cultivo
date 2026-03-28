const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const path = require('path');

(async () => {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        const remoteDir = '/opt/crm-cannabis';
        console.log(`Uploading to ${remoteDir}...`);

        console.log('Uploading tareas.html...');
        await ssh.putFile('c:\\Users\\Cristian\\.gemini\\antigravity\\crm cannabis\\tareas.html', path.join(remoteDir, 'tareas.html'));

        console.log('Uploading style.css...');
        await ssh.putFile('c:\\Users\\Cristian\\.gemini\\antigravity\\crm cannabis\\style.css', path.join(remoteDir, 'style.css'));

        console.log('--- Deployment SUCCESSFUL ---');
        process.exit(0);

    } catch (err) {
        console.error('Deployment ERROR:', err);
        process.exit(1);
    }
})();
