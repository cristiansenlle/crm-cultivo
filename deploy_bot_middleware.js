const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function run() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log('Connected to VPS.');

        await ssh.putFile(
            path.join(__dirname, 'bot_agronomy_server.js'),
            '/root/crm-cannabis/bot_agronomy_server.js'
        );
        console.log('✅ bot_agronomy_server.js uploaded with robust fuzzy matcher!');

        const r = await ssh.execCommand('pm2 restart bot_agronomy_server');
        console.log('PM2 restarted:', r.stdout);

    } catch (err) {
        console.error('Error during deployment:', err);
    } finally {
        ssh.dispose();
    }
}
run();
