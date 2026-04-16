const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const path = require('path');

async function run() {
    const host = '109.199.99.126';
    const username = 'root';
    const passwordsToTry = ['HIDDEN_SECRET_BY_AI', 'SWbCPD6AdBac'];

    let connected = false;
    for (const pwd of passwordsToTry) {
        try {
            console.log('Trying password: ' + pwd.substring(0, 4) + '...');
            await ssh.connect({ host, username, password: pwd, readyTimeout: 10000 });
            console.log('✅ Connected successfully with root!');
            connected = true;
            break;
        } catch (e) {
             console.log('❌ Failed.');
        }
    }

    if (!connected) return console.log("Failed all passwords");

    try {
        const filesToUpload = [
            'cultivo.html',
            'cultivo.js',
            'style.css',
            'index.html',
            'tareas.html',
            'pos.html',
            'insumos.html',
            'protocolos.html',
            'analytics.html'
        ];

        console.log('Uploading Front-End files...');
        for (const file of filesToUpload) {
            const localPath = path.join(__dirname, file);
            const remotePath = `/opt/crm-cannabis/${file}`;
            console.log(`Uploading ${file} -> ${remotePath} ...`);
            await ssh.putFile(localPath, remotePath);
        }

        console.log('\n🚀 HUD Front-End successfully deployed to production server.');
    } catch (err) {
        console.error('Error during deployment:', err);
    } finally {
        ssh.dispose();
    }
}

run();
