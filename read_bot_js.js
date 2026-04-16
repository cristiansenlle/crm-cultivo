const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkBotJS() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('Reading bot.js file...');
    let res = await ssh.execCommand('cat /root/crm/n8n/whatsapp-bot/bot.js');
    console.log("bot.js:", res.stdout);

    ssh.dispose();
}

checkBotJS().catch(console.error);
