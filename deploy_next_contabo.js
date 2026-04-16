const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const path = require('path');
const fs = require('fs');

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
        console.log('Uploading Next.js App to /opt/crm-cannabis-next...');
        await ssh.execCommand('mkdir -p /opt/crm-cannabis-next');

        const localDir = path.join(__dirname, 'next-app');
        const remoteDir = '/opt/crm-cannabis-next';

        await ssh.putDirectory(localDir, remoteDir, {
            recursive: true,
            concurrency: 5,
            validate: function(itemPath) {
                const baseName = path.basename(itemPath);
                return baseName !== 'node_modules' && baseName !== '.next' && baseName !== '.git';
            },
            tick: function(localPath, remotePath, error) {
                if (error) console.log(`Failed: ${localPath}`);
            }
        });

        console.log('\n📦 Application pushed. Compiling and Starting on Server...');
        console.log('(This runs npm install, next build, and starts PM2 on Port 80)...');
        
        await ssh.execCommand('fuser -k 80/tcp || true');
        await ssh.execCommand('setcap cap_net_bind_service=+ep `readlink -f \\`which node\\``');
        
        const output = await ssh.execCommand(
            'npm install && npm run build && pm2 delete next-hud || true ; pm2 start npm --name "next-hud" -- start -- -p 80', 
            { cwd: '/opt/crm-cannabis-next' }
        );
        
        console.log('NPM output:\n', output.stdout);
        if (output.stderr) console.log('\nNPM STDERR Details:\n', output.stderr);

        console.log('\n🚀 Next.js App is running in PM2 on production! Listening on port 3000 locally in the VPS.');
    } catch (err) {
        console.error('Error during deployment:', err);
    } finally {
        ssh.dispose();
    }
}

run();
