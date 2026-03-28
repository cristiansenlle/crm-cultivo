const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function deploy() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log("Backing up and deploying new bot-wa.js...");
        await ssh.execCommand('cp /opt/crm-cannabis/bot-wa.js /opt/crm-cannabis/bot-wa.js.bak');
        
        await ssh.putFile(
            'c:\\Users\\Cristian\\.gemini\\antigravity\\crm cannabis\\bot-wa-fixed.js',
            '/opt/crm-cannabis/bot-wa.js'
        );
        console.log("File uploaded.");

        console.log("Restarting bot...");
        await ssh.execCommand('pm2 restart whatsapp-bot');
        await new Promise(r => setTimeout(r, 12000));

        console.log("=== Bot log after deploy ===");
        const out = await ssh.execCommand('tail -n 15 /root/.pm2/logs/whatsapp-bot-out.log');
        console.log(out.stdout);

        console.log("=== PM2 status ===");
        const pm2 = await ssh.execCommand('pm2 list');
        console.log(pm2.stdout);

        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
deploy();
