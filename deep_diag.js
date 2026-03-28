const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function deepDiag() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log("=== PM2 list ===");
        const pm2 = await ssh.execCommand('pm2 list');
        console.log(pm2.stdout);

        console.log("\n=== Whatsapp-bot LAST 30 lines OUT ===");
        const botOut = await ssh.execCommand('tail -n 30 /root/.pm2/logs/whatsapp-bot-out.log');
        console.log(botOut.stdout);

        console.log("\n=== Whatsapp-bot LAST 30 lines ERROR ===");
        const botErr = await ssh.execCommand('tail -n 30 /root/.pm2/logs/whatsapp-bot-error.log');
        console.log(botErr.stdout);

        console.log("\n=== N8N-service LAST 30 lines OUT ===");
        const n8nOut = await ssh.execCommand('pm2 logs n8n-service --lines 30 --nostream 2>&1 | tail -40');
        console.log(n8nOut.stdout);

        console.log("\n=== Test wa-inbound ===");
        const test = await ssh.execCommand('curl -s -m 5 -X POST http://localhost:5678/webhook/wa-inbound -H "Content-Type: application/json" -d \'{"from":"test","message":"diag test"}\' -w "\\nHTTP:%{http_code}"');
        console.log("Result:", test.stdout.substring(0, 300));

        console.log("\n=== Port 5678 listener check ===");
        const port = await ssh.execCommand('ss -tlnp | grep 5678');
        console.log(port.stdout);

        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
deepDiag();
