const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkFrontendDeep() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log('\\n--- Realtime PM2 Logs for crm-frontend ---');
        const logs = await ssh.execCommand('pm2 logs crm-frontend --lines 50 --nostream');
        console.log(logs.stdout);
        if (logs.stderr) console.error('Stderr:', logs.stderr);

        console.log('\\n--- PM2 Process Info ---');
        const env = await ssh.execCommand('pm2 env crm-frontend');
        console.log(env.stdout);

        console.log('\\n--- Nginx Status ---');
        const nginx = await ssh.execCommand('systemctl status nginx || echo "No nginx"');
        console.log(nginx.stdout);

        ssh.dispose();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkFrontendDeep();
