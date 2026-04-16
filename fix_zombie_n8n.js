const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fix() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log("=== Stopping zombie n8n process (id 9) ===");
        const stop = await ssh.execCommand('pm2 stop 9 && pm2 delete 9');
        console.log(stop.stdout, stop.stderr);

        console.log("\n=== PM2 list after cleanup ===");
        const list = await ssh.execCommand('pm2 list');
        console.log(list.stdout);

        console.log("\n=== Checking registered webhooks in n8n-service ===");
        const wh = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT webhookPath, method, workflowId FROM webhook_entity LIMIT 20;"');
        console.log(wh.stdout);

        console.log("\n=== Testing whatsapp webhook directly ===");
        const test = await ssh.execCommand('curl -s -X POST http://localhost:5678/webhook/whatsapp -H "Content-Type: application/json" -d \'{"Body":"test","From":"5491156548820"}\' -w "\\nHTTP:%{http_code}"');
        console.log(test.stdout);

        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
fix();
