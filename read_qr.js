const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function waitForQR() {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });

        console.log("Waiting 25s for Chrome to load WA and generate QR...");
        await new Promise(r => setTimeout(r, 25000));

        console.log("=== Bot log - looking for QR ===");
        const out = await ssh.execCommand('tail -n 60 /root/.pm2/logs/whatsapp-bot-out.log');
        console.log(out.stdout);

        console.log("\n=== Bot error log ===");
        const err = await ssh.execCommand('tail -n 5 /root/.pm2/logs/whatsapp-bot-error.log');
        console.log(err.stdout);

        console.log("\n=== PM2 restarts ===");
        const pm2 = await ssh.execCommand('pm2 list');
        console.log(pm2.stdout);

        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
waitForQR();
