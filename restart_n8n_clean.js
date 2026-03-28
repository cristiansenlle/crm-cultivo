const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function restartAndVerify() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log("=== Restarting n8n-service to force webhook re-registration ===");
        await ssh.execCommand('pm2 restart n8n-service');
        
        console.log("Waiting 12s for n8n to fully start...");
        await new Promise(r => setTimeout(r, 12000));

        console.log("\n=== Testing wa-inbound webhook after restart ===");
        const test = await ssh.execCommand('curl -s -m 8 -X POST http://localhost:5678/webhook/wa-inbound -H "Content-Type: application/json" -d \'{"from":"5491156548820","message":"hola"}\' -w "\\nSTATUS:%{http_code}"');
        console.log("Response:", test.stdout.substring(0, 400));

        console.log("\n=== PM2 Status ===");
        const pm2 = await ssh.execCommand('pm2 list');
        console.log(pm2.stdout);

        console.log("\n=== Bot last 5 lines ===");
        const botOut = await ssh.execCommand('tail -n 10 /root/.pm2/logs/whatsapp-bot-out.log');
        console.log(botOut.stdout);

        ssh.dispose();
    } catch(e) {
        console.error("Error:", e.message);
        if (ssh) ssh.dispose();
    }
}
restartAndVerify();
