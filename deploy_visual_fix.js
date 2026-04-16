const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');
const path = require('path');

(async () => {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log('Connected. Searching for web root...');
        const findRes = await ssh.execCommand('find /var/www -name tareas.html');
        let remotePath = findRes.stdout.trim().split('\n')[0];

        if (!remotePath) {
            console.log('Not found in /var/www, searching /root...');
            const findResRoot = await ssh.execCommand('find /root -name tareas.html');
            remotePath = findResRoot.stdout.trim().split('\n')[0];
        }

        if (!remotePath) {
            throw new Error('Could not find tareas.html on server.');
        }

        const remoteDir = path.dirname(remotePath);
        console.log(`Found remote directory: ${remoteDir}`);

        console.log('Uploading tareas.html...');
        await ssh.putFile('tareas.html', path.join(remoteDir, 'tareas.html'));

        console.log('Uploading style.css...');
        await ssh.putFile('style.css', path.join(remoteDir, 'style.css'));

        console.log('--- Deployment FINISHED ---');
        process.exit(0);

    } catch (err) {
        console.error('Deployment ERROR:', err);
        process.exit(1);
    }
})();
