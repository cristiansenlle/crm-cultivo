const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function patchFinal() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('Downloading remote bot script...');
    let res = await ssh.execCommand('cat /opt/crm-cannabis/bot-wa.js');
    let code = res.stdout;
    
    // We are replacing the LID block with a foolproof block that checks solely the phone number prefix
    const oldBlock = "const isSelfChat = msg.from === msg.to || msg.from.includes('@lid') || msg.to.includes('@lid');\n\n    console.log('[DEBUG RAW MSG]', msg.from, msg.to, msg.body, msg.fromMe);\n    if ((!isAdmin && !isSelfChat) || msg.from.includes('@g.us') || msg.from.includes('@broadcast')) {\n        return;\n    }";

    const newBlock = `
    const isSelfChat = msg.from.includes('5491156548820') && msg.to.includes('5491156548820');
    
    console.log('[DEBUG RAW MSG]', msg.from, msg.to, msg.body, msg.fromMe);
    
    // Ignore group chats and status broadcasts
    if (msg.from.includes('@g.us') || msg.from.includes('@broadcast')) {
        return;
    }
    
    // Only allow msg if it's sent from admin, or it's a self chat
    if (!isAdmin && !isSelfChat) {
        return;
    }`;

    if (code.includes('const isSelfChat = msg.from === msg.to ||')) {
        code = code.replace(oldBlock, newBlock);
        
        fs.writeFileSync('bot_patched_final.js', code);
        await ssh.putFile('bot_patched_final.js', '/opt/crm-cannabis/bot-wa.js');
        await ssh.execCommand('pm2 restart whatsapp-bot');
        console.log('Bot patched with foolproof self-chat check.');
    } else {
        console.log('Could not find the block to replace.');
    }

    ssh.dispose();
}

patchFinal().catch(console.error);
