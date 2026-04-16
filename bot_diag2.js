const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log("=== FULL TAIL 100 LINES BOT OUT LOG ===");
        const out = await ssh.execCommand('tail -n 100 /root/.pm2/logs/whatsapp-bot-out.log');
        console.log(out.stdout);

        console.log("\n=== WA session directory ===");
        const sess = await ssh.execCommand('ls -la /opt/crm-cannabis/.wwebjs_auth/ 2>/dev/null || echo "NOT FOUND IN /opt"; ls -la /root/.wwebjs_auth/ 2>/dev/null || echo "NOT FOUND IN /root"');
        console.log(sess.stdout);

        console.log("\n=== N8N wa-inbound test ===");
        const curl = await ssh.execCommand(`curl -s -m 3 -X POST http://127.0.0.1:5678/webhook/wa-inbound -H "Content-Type: application/json" -d '{}' -w "\nHTTP:%{http_code}"`);
        console.log(curl.stdout.substring(0, 200));

        console.log("\n=== N8N executions last 5 ===");
        const execs = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "SELECT id, workflowId, status, startedAt FROM execution_entity ORDER BY startedAt DESC LIMIT 5;"`);
        console.log(execs.stdout);

        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
check();
