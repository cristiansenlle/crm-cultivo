const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fixBot() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('Restoring bot script...');
    // We can just upload the current_bot.js minus the bad sendMessage
    let fs = require('fs');
    let code = fs.readFileSync('current_bot.js', 'utf8');
    
    // Revert the bad ready patch
    code = code.replace("    console.log('Esperando mensajes en WhatsApp...');\n    client.sendMessage(client.info.wid._serialized, '🤖 N8N Bot Sistema Reiniciado y Online. Hola Cristian!');", 
                        "    console.log('Esperando mensajes en WhatsApp...');");

    // Add unhandled rejection
    if (!code.includes('uncaughtException')) {
        code = `process.on('uncaughtException', err => console.error('UNCAUGHT:', err));\nprocess.on('unhandledRejection', err => console.error('UNHANDLED:', err));\n` + code;
    }

    fs.writeFileSync('bot_reverted.js', code);
    await ssh.putFile('bot_reverted.js', '/opt/crm-cannabis/bot-wa.js');
    
    console.log('Restarting PM2 whatsapp-bot...');
    await ssh.execCommand('pm2 restart whatsapp-bot');

    console.log('Checking logs...');
    for (let i=0; i<10; i++) {
        await new Promise(r => setTimeout(r, 2000));
        let logs = await ssh.execCommand('pm2 logs whatsapp-bot --lines 10 --nostream');
        if (logs.stdout.includes('conectado y listo') || logs.stdout.includes('UNCAUGHT')) {
            console.log(logs.stdout);
            break;
        }
    }

    ssh.dispose();
}

fixBot().catch(console.error);
