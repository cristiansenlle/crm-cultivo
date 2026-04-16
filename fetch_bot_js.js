const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function fetchBotJS() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    try {
        await ssh.getFile(
            path.join(__dirname, 'downloaded_bot.js'),
            '/root/crm/n8n/whatsapp-bot/bot.js'
        );
        console.log('Successfully downloaded bot.js');
    } catch(e) {
        console.error('Download failed:', e.message);
    }

    ssh.dispose();
}

fetchBotJS().catch(console.error);
