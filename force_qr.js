const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fixBotReal() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('--- Stopping Bot ---');
    await ssh.execCommand('pm2 stop whatsapp-bot');

    console.log('--- Finding .wwebjs_auth ---');
    let findReq = await ssh.execCommand('find / -name ".wwebjs_auth" 2>/dev/null');
    console.log('Found paths:', findReq.stdout);
    
    const paths = findReq.stdout.split('\n').filter(p => p.trim() !== '');
    for (const p of paths) {
        console.log(`Deleting ${p}...`);
        await ssh.execCommand(`rm -rf "${p}"`);
    }

    console.log('--- Starting Bot ---');
    await ssh.execCommand('rm -f /opt/crm-cannabis/qr_code.txt');
    await ssh.execCommand('pm2 start whatsapp-bot');

    console.log('Waiting for QR code to be generated...');
    // We poll until /opt/crm-cannabis/qr_code.txt exists or authenticated
    let qrFound = false;
    for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 2000));
        let checkQr = await ssh.execCommand('cat /opt/crm-cannabis/qr_code.txt');
        if (checkQr.stdout.length > 50) {
            console.log('--- QR CODE EXTRACTED ---');
            console.log(checkQr.stdout);
            qrFound = true;
            break;
        }
        let checkAuth = await ssh.execCommand('pm2 logs whatsapp-bot --lines 5 --nostream');
        if (checkAuth.stdout.includes('Autenticado correctamente')) {
            console.log('Already authenticated without QR?!');
            break;
        }
    }
    if (!qrFound) {
        let finalLogs = await ssh.execCommand('pm2 logs whatsapp-bot --lines 20 --nostream');
        console.log(finalLogs.stdout);
    }

    ssh.dispose();
}

fixBotReal().catch(console.error);
