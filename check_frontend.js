const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkFrontend() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log('\\n--- PM2 Logs for crm-frontend ---');
        const logs = await ssh.execCommand('pm2 logs crm-frontend --lines 20 --nostream');
        console.log(logs.stdout);
        if (logs.stderr) console.error(logs.stderr);

        console.log('\\n--- Restarting CRM Frontend ---');
        const restart = await ssh.execCommand('pm2 restart crm-frontend');
        console.log(restart.stdout);

        // Wait a sec for it to bind
        await new Promise(r => setTimeout(r, 2000));

        console.log('\\n--- Checking Listening Ports Again ---');
        const ports = await ssh.execCommand('ss -tuln | grep -E "80|5678"');
        console.log(ports.stdout);

        ssh.dispose();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkFrontend();
