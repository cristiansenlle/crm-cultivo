const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function hardRest() {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });

        console.log("Stopping bot...");
        await ssh.execCommand('pm2 stop whatsapp-bot');

        console.log("Killing any lingering chrome/chromium...");
        await ssh.execCommand('pkill -9 -f "chrome" || true');
        await ssh.execCommand('pkill -9 -f "chromium" || true');

        console.log("Removing SingletonLock definitely...");
        await ssh.execCommand('rm -f /opt/crm-cannabis/.wwebjs_auth/session-bot/Default/SingletonLock');

        console.log("Removing error log to start fresh...");
        await ssh.execCommand('rm -f /root/.pm2/logs/whatsapp-bot-error.log');

        console.log("Starting bot...");
        await ssh.execCommand('pm2 start whatsapp-bot');

        console.log("Waiting 10s...");
        await new Promise(r => setTimeout(r, 10000));

        console.log("Checking status...");
        const res = await ssh.execCommand('pm2 list');
        console.log(res.stdout);

        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
hardRest();
