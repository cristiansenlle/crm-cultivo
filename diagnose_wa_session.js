const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function diagnoseWA() {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });

        // Check WA session files - are they recent?
        console.log("=== WA session files (most recent) ===");
        const sess = await ssh.execCommand('ls -la /opt/crm-cannabis/.wwebjs_auth/session-bot/Default/ | head -20');
        console.log(sess.stdout);

        // Check the bot error log for auth issues
        console.log("\n=== BOT ERROR LOG (full) ===");
        const err = await ssh.execCommand('cat /root/.pm2/logs/whatsapp-bot-error.log | tail -30');
        console.log(err.stdout);

        // Try to take a screenshot of the WA page via Chrome DevTools
        console.log("\n=== Chrome remote debugging port ===");
        const port = await ssh.execCommand("ps aux | grep chrome | grep -v 'crashpad\\|grep' | grep -o 'remote-debugging-port=[0-9]*'");
        console.log(port.stdout);

        // Check WA LocalStorage to see if session is valid
        console.log("\n=== WA LocalStorage (session key check) ===");
        const ls = await ssh.execCommand('ls /opt/crm-cannabis/.wwebjs_auth/session-bot/Default/Local\\ Storage/ 2>/dev/null || echo "No local storage dir"');
        console.log(ls.stdout);

        // Most critical: look at the FULL out.log for any 'qr', 'auth_failure', 'disconnected' 
        console.log("\n=== Looking for QR/disconnect/auth events in full log ===");
        const events = await ssh.execCommand('grep -E "QR|qr:|ESCANEA|disconnected|auth_fail|DESTRUCT|session" /root/.pm2/logs/whatsapp-bot-out.log | tail -20');
        console.log(events.stdout || "None found");

        console.log("\n=== Checking WA web endpoint directly ===");
        const waCheck = await ssh.execCommand("curl -s -m 5 https://web.whatsapp.com -o /dev/null -w '%{http_code}'");
        console.log("WA web reachable:", waCheck.stdout);

        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
diagnoseWA();
