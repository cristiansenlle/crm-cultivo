const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function finalCheck() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        // Wait for bot to finish init
        await new Promise(r => setTimeout(r, 15000));

        console.log("=== Bot log (last 20 lines) ===");
        const out = await ssh.execCommand('tail -n 20 /root/.pm2/logs/whatsapp-bot-out.log');
        console.log(out.stdout);

        console.log("=== Error log (last 5) ===");
        const err = await ssh.execCommand('tail -n 5 /root/.pm2/logs/whatsapp-bot-error.log');
        console.log(err.stdout);

        console.log("=== N8N last executions ===");
        const exec = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite 'SELECT id,status,startedAt FROM execution_entity ORDER BY startedAt DESC LIMIT 3;'");
        console.log(exec.stdout);

        console.log("=== PM2 status ===");
        const pm2 = await ssh.execCommand('pm2 list');
        console.log(pm2.stdout);

        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
finalCheck();
