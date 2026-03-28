const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function patchFinalFix() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('Downloading remote bot script...');
    let res = await ssh.execCommand('cat /opt/crm-cannabis/bot-wa.js');
    let code = res.stdout;
    
    const oldBlock = `    const isSelfChat = msg.from.includes('5491156548820') && msg.to.includes('5491156548820');
    
    console.log('[DEBUG RAW MSG]', msg.from, msg.to, msg.body, msg.fromMe);
    
    // Ignore group chats and status broadcasts
    if (msg.from.includes('@g.us') || msg.from.includes('@broadcast')) {
        return;
    }
    
    // ONLY allow messages if it's strictly a self-chat (me to me)
    if (!isSelfChat) {
        return;
    }`;

    // The user's Linked Device ID (LID) is 228612670267594
    // We consider it a self-chat if BOTH the sender and the recipient are either the phone number OR the LID.
    const newBlock = `
    const validIds = ['5491156548820', '228612670267594'];
    const isSelfChat = validIds.some(id => msg.from.includes(id)) && validIds.some(id => msg.to.includes(id));
    
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
        
        fs.writeFileSync('bot_patched_self_lid.js', code);
        await ssh.putFile('bot_patched_self_lid.js', '/opt/crm-cannabis/bot-wa.js');
        await ssh.execCommand('pm2 restart whatsapp-bot');
        console.log('Bot patched to include LID in self-chat checks.');
    } else {
        console.log('Could not find the block to replace.');
    }

    ssh.dispose();
}

patchFinalFix().catch(console.error);
