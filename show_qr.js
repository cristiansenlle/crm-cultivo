const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function showQR() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'HIDDEN_SECRET_BY_AI' 
        });

        console.log('--- BUSCANDO CÓDIGO QR EN LOS LOGS ---');
        const res = await ssh.execCommand('pm2 logs whatsapp-bot --lines 100 --nostream');
        console.log(res.stdout);
        
        ssh.dispose();
    } catch (err) {
        console.error('Error al conectar:', err.message);
    }
}

showQR();
