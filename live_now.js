const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function liveCheck() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log("=== PM2 STATUS ===");
        const pm2 = await ssh.execCommand('pm2 list');
        console.log(pm2.stdout);

        console.log("=== LAST 30 LINES BOT OUT ===");
        const out = await ssh.execCommand('tail -n 30 /root/.pm2/logs/whatsapp-bot-out.log');
        console.log(out.stdout);

        console.log("=== N8N LAST 5 EXECUTIONS (WITH TIMESTAMPS) ===");
        const exec = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite 'SELECT id,status,startedAt FROM execution_entity ORDER BY startedAt DESC LIMIT 5;'");
        console.log(exec.stdout);

        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
liveCheck();
