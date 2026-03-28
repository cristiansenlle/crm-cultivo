const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function patchAntiLoop() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('Downloading remote bot script...');
    let res = await ssh.execCommand('cat /opt/crm-cannabis/bot-wa.js');
    let code = res.stdout;
    
    // Check if we already have the anti loop
    if (!code.includes("msg.body.startsWith('\\u200B')")) {
        // Find a safe spot to inject this. 
        // We'll inject it right after `console.log('[DEBUG RAW MSG]'...);`
        
        let targetLine = "console.log('[DEBUG RAW MSG]', msg.from, msg.to, msg.body, msg.fromMe);";
        let newLines = "console.log('[DEBUG RAW MSG]', msg.from, msg.to, msg.body, msg.fromMe);\n    \n    // ANTI-LOOP: If message starts with zero-width space, it's our own AI reply\n    if (msg.body && msg.body.startsWith('\\u200B')) {\n        return;\n    }";
        
        if (code.includes(targetLine)) {
            code = code.replace(targetLine, newLines);
            fs.writeFileSync('bot_patched_anti_loop.js', code);
            await ssh.putFile('bot_patched_anti_loop.js', '/opt/crm-cannabis/bot-wa.js');
            await ssh.execCommand('pm2 restart whatsapp-bot');
            console.log('Bot patched for Anti-Loop (zero-width space check).');
        } else {
            console.log('Could not find target line to inject anti-loop.');
        }
    } else {
        console.log('Bot already has anti-loop check.');
    }

    ssh.dispose();
}

patchAntiLoop().catch(console.error);
