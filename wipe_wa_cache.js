const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        // Last 20 lines of bot log
        const out = await ssh.execCommand('tail -n 20 /root/.pm2/logs/whatsapp-bot-out.log');
        console.log("=== BOT OUT ===");
        console.log(out.stdout);

        // Last 5 N8N executions with timestamps
        const exec = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite 'SELECT id,status,startedAt FROM execution_entity ORDER BY startedAt DESC LIMIT 5;'");
        console.log("=== N8N EXECS ===");
        console.log(exec.stdout);

        // All Chrome PIDs
        const chrome = await ssh.execCommand("ps aux | grep chrome | grep -v 'crashpad\\|grep' | awk '{print $1, $2, $11}' | head -3");
        console.log("=== CHROME ===");
        console.log(chrome.stdout || "none");

        // Wipe WhatsApp session and restart bot fresh to force re-auth
        console.log("\n=== WIPING STALE WA SESSION + RESTARTING BOT ===");
        await ssh.execCommand('pm2 stop whatsapp-bot');
        await ssh.execCommand('pkill -9 -f chrome 2>/dev/null || true');
        await new Promise(r => setTimeout(r, 2000));

        // Clear the session cache to force fresh reconnect
        await ssh.execCommand('rm -rf /opt/crm-cannabis/.wwebjs_auth/session-bot/Default/Cache /opt/crm-cannabis/.wwebjs_auth/session-bot/Default/Code\\ Cache /opt/crm-cannabis/.wwebjs_auth/session-bot/Default/GPUCache 2>/dev/null || true');

        await ssh.execCommand('pm2 start whatsapp-bot');
        await new Promise(r => setTimeout(r, 12000));

        const newOut = await ssh.execCommand('tail -n 15 /root/.pm2/logs/whatsapp-bot-out.log');
        console.log("=== BOT LOG AFTER RESTART ===");
        console.log(newOut.stdout);

        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
check();
