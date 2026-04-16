const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function patchBotReady() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('Downloading remote bot script...');
    let res = await ssh.execCommand('cat /opt/crm-cannabis/bot-wa.js');
    let code = res.stdout;
    
    if (code && !code.includes('Test from bot upon ready')) {
        const replaceStr = "    console.log('Esperando mensajes en WhatsApp...');\n    client.sendMessage(client.info.wid._serialized, '🤖 N8N Bot Sistema Reiniciado y Online. Hola Cristian!');";
        
        const searchRegex = /    console\.log\('Esperando mensajes en WhatsApp\.\.\.'\);/g;
        
        if (searchRegex.test(code)) {
            code = code.replace(searchRegex, replaceStr);
            fs.writeFileSync('bot_patched_ready.js', code);
            
            console.log('Uploading patched script...');
            await ssh.putFile('bot_patched_ready.js', '/opt/crm-cannabis/bot-wa.js');
            
            console.log('Restarting PM2 whatsapp-bot...');
            await ssh.execCommand('pm2 restart whatsapp-bot');
        } else {
            console.log('Search string not found in bot script.');
        }
    } else {
        console.log('Script already patched or empty.');
        // Unpatching just in case of weird state
        await ssh.execCommand('pm2 restart whatsapp-bot');
    }

    ssh.dispose();
}

patchBotReady().catch(console.error);
