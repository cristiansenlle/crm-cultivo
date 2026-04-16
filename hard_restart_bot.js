const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function hardRestart() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        // Check the actual bot source to understand WA connection mode
        console.log("=== Bot WA connection code (lines 85-100) ===");
        const src = await ssh.execCommand('sed -n "80,110p" /opt/crm-cannabis/bot-wa.js');
        console.log(src.stdout);

        // Check if there are any Puppeteer/Chrome processes
        console.log("\n=== Chrome/Puppeteer processes ===");
        const chrome = await ssh.execCommand('ps aux | grep -E "chrome|chromium|puppeteer" | grep -v grep');
        console.log(chrome.stdout || "none found");

        // Hard restart - delete WA session cache AND restart bot
        console.log("\n=== Checking WA session size ===");
        const sessSize = await ssh.execCommand('du -sh /opt/crm-cannabis/.wwebjs_auth/session-bot/ 2>/dev/null');
        console.log(sessSize.stdout);

        // Just do a hard pm2 restart of the bot
        console.log("\n=== Hard stopping bot ===");
        await ssh.execCommand('pm2 stop whatsapp-bot');
        await new Promise(r => setTimeout(r, 2000));

        console.log("=== Starting bot fresh ===");
        await ssh.execCommand('pm2 start whatsapp-bot');
        await new Promise(r => setTimeout(r, 8000));

        console.log("\n=== Bot log after hard restart ===");
        const newLog = await ssh.execCommand('tail -n 20 /root/.pm2/logs/whatsapp-bot-out.log');
        console.log(newLog.stdout);

        console.log("\n=== PM2 status ===");
        const pm2 = await ssh.execCommand('pm2 list');
        console.log(pm2.stdout);

        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
hardRestart();
