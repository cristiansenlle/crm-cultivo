const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function patchFinalFix() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('Downloading remote bot script...');
    let res = await ssh.execCommand('cat /opt/crm-cannabis/bot-wa.js');
    let code = res.stdout;
    
    // Replace the overly permissive self-chat logic
    const oldBlock = `    const isSelfChat = msg.from.includes('5491156548820') && msg.to.includes('5491156548820');
    
    console.log('[DEBUG RAW MSG]', msg.from, msg.to, msg.body, msg.fromMe);
    
    // Ignore group chats and status broadcasts
    if (msg.from.includes('@g.us') || msg.from.includes('@broadcast')) {
        return;
    }
    
    // Only allow msg if it's sent from admin, or it's a self chat
    if (!isAdmin && !isSelfChat) {
        return;
    }`;

    // A chat is "self chat" strictly if the FROM and TO are both the user's number.
    // If msg.to is someone else's number, or msg.from is someone else's number, it's not a self-chat.
    const newBlock = `
    const isSelfChat = msg.from.includes('5491156548820') && msg.to.includes('5491156548820');
    
    console.log('[DEBUG RAW MSG]', msg.from, msg.to, msg.body, msg.fromMe);
    
    // Ignore group chats and status broadcasts
    if (msg.from.includes('@g.us') || msg.from.includes('@broadcast')) {
        return;
    }
    
    // ONLY allow messages if it's strictly a self-chat (me to me)
    if (!isSelfChat) {
        return;
    }`;

    if (code.includes("const isSelfChat = msg.from.includes('5491156548820') && msg.to.includes('5491156548820');")) {
        code = code.replace(oldBlock, newBlock);
        
        fs.writeFileSync('bot_patched_self_only.js', code);
        await ssh.putFile('bot_patched_self_only.js', '/opt/crm-cannabis/bot-wa.js');
        await ssh.execCommand('pm2 restart whatsapp-bot');
        console.log('Bot patched to STRICTLY ONLY reply to self-chat.');
    } else {
        console.log('Could not find the block to replace.');
    }

    ssh.dispose();
}

patchFinalFix().catch(console.error);
