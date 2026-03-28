const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fullDiag() {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });

        // Get FULL bot out log since last restart
        console.log("=== FULL BOT LOG SINCE LAST RESTART ===");
        const out = await ssh.execCommand('tail -n 200 /root/.pm2/logs/whatsapp-bot-out.log');
        console.log(out.stdout);

        // Any errors?
        console.log("=== BOT ERROR LOG (last 10) ===");
        const err = await ssh.execCommand('tail -n 10 /root/.pm2/logs/whatsapp-bot-error.log');
        console.log(err.stdout);

        // N8N executions - are new ones appearing?
        console.log("=== N8N LAST 5 EXECUTIONS ===");
        const exec = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite 'SELECT id,status,startedAt FROM execution_entity ORDER BY startedAt DESC LIMIT 5;'");
        console.log(exec.stdout);

        // Check phone number in bot source
        console.log("=== PHONE FILTER IN BOT ===");
        const num = await ssh.execCommand('grep -n "NUMERO_ADMIN\\|phoneNum\\|fromMe\\|message_create" /opt/crm-cannabis/bot-wa.js');
        console.log(num.stdout);

        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
fullDiag();
