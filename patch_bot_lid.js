const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function patchBoth() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('Downloading remote bot script...');
    let res = await ssh.execCommand('cat /opt/crm-cannabis/bot-wa.js');
    let code = res.stdout;
    
    // Check if hasn't been replaced yet
    if (code && !code.includes("@lid")) {
        console.log("Applying patches...");
        
        let oldLine1 = "const isSelfChat = msg.from === msg.to;";
        let newLine1 = "const isSelfChat = msg.from === msg.to || msg.from.includes('@lid') || msg.to.includes('@lid');";
        
        let oldLine2 = "if (!isAdmin || !isSelfChat || msg.from.includes('@g.us') || msg.from.includes('@broadcast')) {";
        let newLine2 = "if ((!isAdmin && !isSelfChat) || msg.from.includes('@g.us') || msg.from.includes('@broadcast')) {";

        code = code.replace(oldLine1, newLine1).replace(oldLine2, newLine2);
        
        fs.writeFileSync('bot_patched_lid.js', code);
        
        console.log('Uploading patched script...');
        await ssh.putFile('bot_patched_lid.js', '/opt/crm-cannabis/bot-wa.js');
        
        console.log('Restarting PM2 whatsapp-bot...');
        await ssh.execCommand('pm2 restart whatsapp-bot');
        
        console.log('Bot patched for LID successfully.');
    } else {
         console.log('Script already patched with LID logic.');
    }

    ssh.dispose();
}

patchBoth().catch(console.error);
