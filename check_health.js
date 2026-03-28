const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log("=== PM2 STATUS ===");
        const pm2 = await ssh.execCommand('pm2 list');
        console.log(pm2.stdout);

        console.log("\n=== N8N HEALTH ===");
        const n8n = await ssh.execCommand('curl -s -o /dev/null -w "%{http_code}" http://localhost:5678/healthz');
        console.log("N8N HTTP:", n8n.stdout);

        console.log("\n=== LAST 30 LINES PM2 ERROR LOG ===");
        const err = await ssh.execCommand('tail -n 30 /root/.pm2/logs/whatsapp-bot-error.log');
        console.log(err.stdout);

        console.log("\n=== LAST 20 LINES PM2 OUT LOG ===");
        const out = await ssh.execCommand('tail -n 20 /root/.pm2/logs/whatsapp-bot-out.log');
        console.log(out.stdout);

        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
check();
