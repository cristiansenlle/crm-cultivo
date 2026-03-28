const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log("=== BOT OUT TAIL 50 ===");
        const out = await ssh.execCommand('tail -n 50 /root/.pm2/logs/whatsapp-bot-out.log');
        console.log(out.stdout);

        console.log("=== LAST 5 N8N EXECUTIONS ===");
        const exec = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite 'SELECT id,status,startedAt FROM execution_entity ORDER BY startedAt DESC LIMIT 5;'");
        console.log(exec.stdout);

        console.log("=== PM2 STATUS ===");
        const pm2 = await ssh.execCommand('pm2 list');
        console.log(pm2.stdout);

        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
check();
