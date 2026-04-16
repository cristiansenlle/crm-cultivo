const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkLogs() {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
        console.log('Connected to server...');
        const logs = await ssh.execCommand('tail -n 100 /root/.pm2/logs/bot-agronomy-server-out.log');
        console.log('--- AGRO LOGS ---');
        console.log(logs.stdout);
    } catch (e) {
        console.error('Error connecting to server:', e.message);
    } finally {
        ssh.dispose();
    }
}
checkLogs();
