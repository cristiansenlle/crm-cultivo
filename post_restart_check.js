const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkAfterRestart() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        // Check if there are new messages since the restart
        console.log("=== Bot out log - ONLY NEW LINES (search for 'Capturando') ===");
        const out = await ssh.execCommand('tail -n 80 /root/.pm2/logs/whatsapp-bot-out.log | grep -A5 "Capturando" | tail -30');
        console.log(out.stdout || "NO NEW MESSAGES CAPTURED");

        // Check timestamp of last line to see if its recent
        console.log("\n=== Last line of bot log (with context) ===");
        const lastLine = await ssh.execCommand('tail -n 5 /root/.pm2/logs/whatsapp-bot-out.log');
        console.log(lastLine.stdout);

        // Check Puppeteer Chrome main process (not just crashpad)
        console.log("\n=== Chrome main process ===");
        const chrome = await ssh.execCommand('ps aux | grep chrome | grep -v "crashpad\\|grep" | head -5');
        console.log(chrome.stdout || "No chrome main process found");

        // Test if bot can reach n8n
        console.log("\n=== Bot -> N8N connectivity test ===");
        const conn = await ssh.execCommand('curl -s -m 3 -o /dev/null -w "%{http_code}" http://109.199.99.126:5678/webhook/wa-inbound -X POST -H "Content-Type: application/json" -d \'{"test":1}\'');
        console.log("HTTP code:", conn.stdout);

        // Check if WA SingletonLock exists (corrupted session)
        console.log("\n=== WA session lock file ===");
        const lock = await ssh.execCommand('ls -la /opt/crm-cannabis/.wwebjs_auth/session-bot/Default/SingletonLock 2>/dev/null || echo "No lock file"');
        console.log(lock.stdout);

        // Check if the bot is even matching the phone number filter
        console.log("\n=== Check NUMERO_ADMIN in bot source ===");
        const num = await ssh.execCommand('grep -n "NUMERO_ADMIN\\|5491156548820" /opt/crm-cannabis/bot-wa.js');
        console.log(num.stdout);

        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
checkAfterRestart();
