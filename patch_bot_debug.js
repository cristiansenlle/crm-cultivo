const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function patchBot() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('Downloading remote bot script...');
    let res = await ssh.execCommand('cat /opt/crm-cannabis/bot-wa.js');
    let code = res.stdout;
    
    if (code && !code.includes('[DEBUG RAW MSG]')) {
        const replaceStr = "    console.log('[DEBUG RAW MSG]', msg.from, msg.to, msg.body, msg.fromMe);\n    if (!isAdmin || !isSelfChat || msg.from.includes('@g.us') || msg.from.includes('@broadcast')) {\n        return;\n    }";
        
        // Find the line to replace
        const searchRegex = /    if \(\!isAdmin \|\| \!isSelfChat \|\| msg\.from\.includes\('@g\.us'\) \|\| msg\.from\.includes\('@broadcast'\)\) \{\n        return;\n    \}/g;
        
        if (searchRegex.test(code)) {
            code = code.replace(searchRegex, replaceStr);
            fs.writeFileSync('bot_patched_debug.js', code);
            
            console.log('Uploading patched script...');
            await ssh.putFile('bot_patched_debug.js', '/opt/crm-cannabis/bot-wa.js');
            
            console.log('Restarting PM2 whatsapp-bot...');
            await ssh.execCommand('pm2 restart whatsapp-bot');
        } else {
            console.log('Search string not found in bot script.');
        }
    } else {
        console.log('Script already patched or empty.');
    }

    ssh.dispose();
}

patchBot().catch(console.error);
