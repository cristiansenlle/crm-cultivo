const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkBotLogs() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod' 
        });

        const res = await ssh.execCommand('pm2 logs whatsapp-bot --lines 500 --nostream | grep "Respuesta n8n"');
        console.log('Bot Logs (Response):\n', res.stdout);
        ssh.dispose();
    } catch (err) {
        console.error('Check bot logs failed:', err.message);
    }
}

checkBotLogs();
