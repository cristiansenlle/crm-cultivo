const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

async function run() {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
        console.log("Reiniciando PM2 bot-wa...");
        
        await ssh.execCommand('rm -f /opt/crm-cannabis/qr_code.txt');
        await ssh.execCommand('rm -rf /opt/crm-cannabis/.wwebjs_auth/session-bot');
        await ssh.execCommand('pm2 delete bot-wa');
        await ssh.execCommand('pm2 start /opt/crm-cannabis/bot-wa.js --name bot-wa');
        await ssh.execCommand('pm2 save');
        
        console.log("Aguardando inicializacion de Chromium headless (25s)...");
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        
        let qrData = '';
        for (let i=0; i<8; i++) {
            await sleep(5000);
            const res = await ssh.execCommand('cat /opt/crm-cannabis/qr_code.txt');
            if (res.stdout && res.stdout.length > 20) {
                qrData = res.stdout.trim();
                console.log("QR ENCONTRADO!");
                break;
            } else {
                console.log("Chequeo " + i + ": sin qr aun...");
            }
        }
        
        if (qrData) {
            fs.writeFileSync('C:\\Users\\Cristian\\.gemini\\antigravity\\brain\\a512f93b-e4d7-4798-9c08-adb064003629\\qr_code.txt', qrData);
        } else {
            console.log("NO SE GENERÓ EL QR.");
            const logs = await ssh.execCommand('pm2 logs bot-wa --lines 30 --nostream');
            console.log("LOGS:", logs.stdout, logs.stderr);
        }

        ssh.dispose();
    } catch(e) {
        console.error(e);
    }
}
run();
