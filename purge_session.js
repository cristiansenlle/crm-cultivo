const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function purge() {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });

        console.log("Stopping bot...");
        await ssh.execCommand('pm2 stop whatsapp-bot');

        console.log("Purging all session data...");
        await ssh.execCommand('rm -rf /opt/crm-cannabis/.wwebjs_auth');

        console.log("Starting bot fresh...");
        await ssh.execCommand('pm2 start whatsapp-bot');

        console.log("Done. Monitoring logs for QR...");
        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
purge();
