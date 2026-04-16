const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function verify() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        // Check what URL the bot is using
        console.log("=== Bot config / env ===");
        const env1 = await ssh.execCommand('cat /opt/crm-cannabis/.env 2>/dev/null || cat /opt/crm-cannabis/config.js 2>/dev/null | head -20');
        console.log(env1.stdout || "No .env found");

        console.log("\n=== Bot source - webhook URL ===");
        const grep = await ssh.execCommand('grep -n "webhook\\|5678\\|n8n" /opt/crm-cannabis/bot-wa.js | head -20');
        console.log(grep.stdout);

        // Test wa-inbound with a real-looking payload
        console.log("\n=== Testing wa-inbound POST ===");
        const test = await ssh.execCommand('curl -s -m 5 -X POST http://localhost:5678/webhook/wa-inbound -H "Content-Type: application/json" -d \'{"from":"5491156548820","message":"hola"}\' -w "\\nSTATUS:%{http_code}"');
        console.log(test.stdout || "timeout/empty");

        // Check last N8N out logs to see inbound webhook activity
        console.log("\n=== N8N-service recent out logs ===");
        const n8nOut = await ssh.execCommand('pm2 logs n8n-service --lines 20 --nostream 2>&1 | tail -30');
        console.log(n8nOut.stdout);

        ssh.dispose();
    } catch(e) {
        console.error("Error:", e.message);
        if (ssh) ssh.dispose();
    }
}
verify();
