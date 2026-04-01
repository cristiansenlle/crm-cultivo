const fs = require('fs');
const path = require('path');
const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function uploadAllHTML() {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
        console.log('Connected to VPS.');

        const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.html'));
        for (const file of files) {
            const localPath = path.join(__dirname, file);
            const remotePath = `/opt/crm-cannabis/${file}`;
            console.log(`Uploading ${file}...`);
            await ssh.putFile(localPath, remotePath);
        }

        console.log('Upload complete! All HTML files synchronized to /opt/crm-cannabis');
    } catch (err) {
        console.error('Failed to upload files:', err);
    } finally {
        ssh.dispose();
    }
}

uploadAllHTML();
