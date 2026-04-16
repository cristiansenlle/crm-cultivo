const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fixPort() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log('\\n--- Deleting old PM2 frontend process ---');
        await ssh.execCommand('pm2 delete crm-frontend');

        console.log('\\n--- Starting CRM frontend on port 80 ---');
        const start = await ssh.execCommand('pm2 start "serve . -s -l 80" --name crm-frontend --cwd /opt/crm-cannabis');
        console.log(start.stdout);

        console.log('\\n--- Saving PM2 state ---');
        await ssh.execCommand('pm2 save');

        console.log('\\n--- Verify listening ports ---');
        const ports = await ssh.execCommand('ss -tuln | grep -E "80|5678"');
        console.log(ports.stdout);

        ssh.dispose();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

fixPort();
