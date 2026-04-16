const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fixBot() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        // Dump last 150 lines of bot log to get full picture
        console.log("=== Full recent bot log ===");
        const out = await ssh.execCommand('tail -n 150 /root/.pm2/logs/whatsapp-bot-out.log');
        console.log(out.stdout);

        // Check if 'qr' event fired (means session is invalid)
        console.log("\n=== Did QR fire? (check for QR in log) ===");
        const qr = await ssh.execCommand('grep -c "ESCANEA\\|qr\\|QR" /root/.pm2/logs/whatsapp-bot-out.log 2>/dev/null');
        console.log("QR lines:", qr.stdout);

        // Check for disconnected event
        console.log("=== Disconnected events in log? ===");
        const disc = await ssh.execCommand('grep -i "disconnect\\|auth_fail\\|session\\|logged" /root/.pm2/logs/whatsapp-bot-out.log | tail -5');
        console.log(disc.stdout || "none found");

        // Check how many times bot restarted
        const pm2 = await ssh.execCommand('pm2 show whatsapp-bot 2>&1 | grep restart');
        console.log("Restarts:", pm2.stdout);

        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
fixBot();
