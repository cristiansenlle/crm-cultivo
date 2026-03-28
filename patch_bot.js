const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fixBot() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('--- Stopping Bot ---');
    await ssh.execCommand('pm2 stop whatsapp-bot');

    console.log('--- Removing corrupted session ---');
    await ssh.execCommand('rm -rf /opt/crm-cannabis/.wwebjs_auth');

    console.log('--- Patching bot.js to save QR string ---');
    let res = await ssh.execCommand('cat /opt/crm-cannabis/bot-wa.js');
    let code = res.stdout;
    
    // Add saving the QR string to /opt/crm-cannabis/qr_code.txt
    if (!code.includes('qr_code.txt')) {
        code = code.replace("qrcode.generate(qr, { small: true });", "qrcode.generate(qr, { small: true });\n    fs.writeFileSync('/opt/crm-cannabis/qr_code.txt', qr);");
        
        // Let's write the code back
        const path = require('path');
        const fs = require('fs');
        fs.writeFileSync(path.join(__dirname, 'bot_patched.js'), code);
        await ssh.putFile(path.join(__dirname, 'bot_patched.js'), '/opt/crm-cannabis/bot-wa.js');
        console.log('Bot code updated.');
    } else {
        console.log('Bot code already patched.');
    }

    console.log('--- Starting Bot ---');
    await ssh.execCommand('pm2 start whatsapp-bot');

    console.log('Waiting for QR code to be generated...');
    // We poll until /opt/crm-cannabis/qr_code.txt exists or authenticated
    for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 2000));
        let checkQr = await ssh.execCommand('cat /opt/crm-cannabis/qr_code.txt');
        if (checkQr.stdout.length > 10) {
            console.log('--- QR CODE EXTRACTED ---');
            console.log(checkQr.stdout);
            break;
        }
        let checkAuth = await ssh.execCommand('pm2 logs whatsapp-bot --lines 5 --nostream');
        if (checkAuth.stdout.includes('Autenticado correctamente')) {
            console.log('Already authenticated without QR?!');
            break;
        }
    }

    ssh.dispose();
}

fixBot().catch(console.error);
