const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fix() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log("=== Checking which N8N port is active ===");
        const ports = await ssh.execCommand('ss -tlnp | grep -E "5678|3000"');
        console.log(ports.stdout);

        console.log("\n=== N8N process 9 logs (last 30 lines) ===");
        const n8nLog = await ssh.execCommand('pm2 logs 9 --lines 30 --nostream');
        console.log(n8nLog.stdout);
        console.log(n8nLog.stderr);

        console.log("\n=== Checking webhook URL that bot is hitting ===");
        const botEnv = await ssh.execCommand('cat /opt/crm-cannabis/.env | grep -i webhook');
        console.log(botEnv.stdout);

        console.log("\n=== Testing webhook directly ===");
        const wh = await ssh.execCommand('curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5678/webhook/whatsapp-inbound -H "Content-Type: application/json" -d \'{"message":"test"}\'');
        console.log("Webhook test HTTP code:", wh.stdout);

        // Try alternative port / n8n-service (pm2 id 3)
        const wh2 = await ssh.execCommand('curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5679/webhook/whatsapp-inbound -H "Content-Type: application/json" -d \'{"message":"test"}\'');
        console.log("Port 5679 test:", wh2.stdout);

        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
fix();
