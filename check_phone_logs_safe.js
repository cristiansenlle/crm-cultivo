const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkPhoneLogs() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod' 
        });

        const res = await ssh.execCommand('pm2 logs whatsapp-bot --lines 1000 --nostream | grep "Capturando mensaje de"');
        console.log('Capture Logs:\n', res.stdout);
        ssh.dispose();
    } catch (err) {
        console.error('Check phone logs failed:', err.message);
    }
}

checkPhoneLogs();
