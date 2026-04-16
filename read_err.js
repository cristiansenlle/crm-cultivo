const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
        const err = await ssh.execCommand('tail -n 20 /root/.pm2/logs/whatsapp-bot-error.log');
        console.log("=== ERROR LOG ===");
        console.log(err.stdout);
        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
check();
