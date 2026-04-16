const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkIgnoredLogs() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'HIDDEN_SECRET_BY_AI' 
        });

        const res = await ssh.execCommand('pm2 logs whatsapp-bot --lines 1000 --nostream | grep "Ignored: Not admin"');
        console.log('Ignored Logs:\n', res.stdout);
        ssh.dispose();
    } catch (err) {
        console.error('Check ignored logs failed:', err.message);
    }
}

checkIgnoredLogs();
