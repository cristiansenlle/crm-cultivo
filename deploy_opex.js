const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');

const ssh = new NodeSSH();
const LOCAL_DIR = __dirname;

async function deployFrontend() {
    console.log("Connecting to production server...");
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log("Uploading files to web root...");
    const actualRoot = '/var/www/html'; // Known functional root from previous deployments

    const filesToUpload = [
        'insumos.html',
        'insumos.js',
        'analytics.js'
    ];

    for (const file of filesToUpload) {
        const localPath = path.join(LOCAL_DIR, file);
        if (fs.existsSync(localPath)) {
            await ssh.putFile(localPath, `${actualRoot}/${file}`);
            console.log(`Uploaded ${file}`);
        } else {
            console.log(`Skipped ${file} (local file missing)`);
        }
    }

    console.log("Restarting NGINX...");
    await ssh.execCommand('systemctl restart nginx || service nginx restart');

    console.log("Deployment complete!");
    ssh.dispose();
}

deployFrontend().catch(console.error);
