const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');

const ssh = new NodeSSH();
const LOCAL_DIR = __dirname;
const REMOTE_DIR = '/var/www/html'; // Or whatever directory nginx uses
// Wait, previous scripts used /opt/crm-cannabis for something, but usually /var/www/html is the web root.
// In check_frontend.js we saw the paths. /var/www/html is usually accurate. Let's see check_frontend.js if we aren't sure.
// Let's just transfer files.

async function deployFrontend() {
    console.log("Connecting to production server...");
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log("Uploading files to web root...");
    
    // Check real web root
    const rootCheck = await ssh.execCommand('ls /var/www/html/index.html 2>/dev/null');
    const actualRoot = rootCheck.stdout ? '/var/www/html' : '/opt/crm-cannabis';
    console.log("Using remote web directory:", actualRoot);

    const filesToUpload = [
        'index.html',
        'pos.html',
        'cultivo.html',
        'tareas.html',
        'insumos.html',
        'analytics.html',
        'agronomy.html',
        'protocolos.html',
        'protocolos.js',
        'style.css'
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

    console.log("Fixing permissions...");
    await ssh.execCommand(`chmod -R 755 ${actualRoot}`);
    await ssh.execCommand('systemctl restart nginx || service nginx restart');

    console.log("Deployment complete!");
    ssh.dispose();
}

deployFrontend().catch(console.error);
