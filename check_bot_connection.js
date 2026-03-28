const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkNew() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        // Get timestamps of last lines to know if any NEW messages came in
        console.log("=== CHECKING FOR NEW MESSAGES (after restart) ===");
        const lastLines = await ssh.execCommand('tail -n 50 /root/.pm2/logs/whatsapp-bot-out.log');
        console.log(lastLines.stdout);

        console.log("\n=== BOT STDERR (recent) ===");
        const errNew = await ssh.execCommand('tail -n 5 /root/.pm2/logs/whatsapp-bot-error.log');
        console.log(errNew.stdout);

        console.log("\n=== Checking if bot WA is connected (look for 'ready' or 'QR') ===");
        const ready = await ssh.execCommand('grep -i "ready\\|qr\\|authenticated\\|disconnected" /root/.pm2/logs/whatsapp-bot-out.log | tail -5');
        console.log(ready.stdout);

        // Check PM2 restart count for the bot
        console.log("\n=== PM2 restart count for bot ===");
        const pm2 = await ssh.execCommand('pm2 show whatsapp-bot | grep -E "restart|uptime|status"');
        console.log(pm2.stdout);

        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
checkNew();
