const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });

        console.log("=== BOT OUT - LAST 50 LINES ===");
        const out = await ssh.execCommand('tail -n 50 /root/.pm2/logs/whatsapp-bot-out.log');
        console.log(out.stdout);

        console.log("\n=== LAST 5 N8N EXECUTIONS ===");
        const exec = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite 'SELECT id,status,startedAt FROM execution_entity ORDER BY startedAt DESC LIMIT 5;'");
        console.log(exec.stdout);

        console.log("\n=== BOT UPTIME / RESTARTS ===");
        const pm2 = await ssh.execCommand('pm2 list');
        console.log(pm2.stdout);

        // Check if message even made it to bot
        console.log("\n=== grep for 'hola' in last 2000 lines ===");
        const hola = await ssh.execCommand("tail -n 2000 /root/.pm2/logs/whatsapp-bot-out.log | grep -i 'hola'");
        console.log(hola.stdout || "NOT FOUND - message never reached the bot");

        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
check();
