const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function finalCheck() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        // Test the actual webhook
        const test = await ssh.execCommand('curl -s -m 5 -X POST http://localhost:5678/webhook/wa-inbound -H "Content-Type: application/json" -d \'{"from":"5491156548820","message":"hola"}\' -w "\\nSTATUS:%{http_code}"');
        console.log("Webhook test:", test.stdout.substring(0, 500));
        
        // Check recent bot logs for new activity
        const botOut = await ssh.execCommand('tail -n 20 /root/.pm2/logs/whatsapp-bot-out.log');
        console.log("Recent bot logs:", botOut.stdout);

        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
finalCheck();
