const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function freshQR() {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });

        // Check if session was actually created after QR scan
        console.log("=== WA session directory after scan ===");
        const sess = await ssh.execCommand('ls -la /opt/crm-cannabis/.wwebjs_auth/ 2>/dev/null');
        console.log(sess.stdout);

        const sessBot = await ssh.execCommand('ls /opt/crm-cannabis/.wwebjs_auth/session-bot/ 2>/dev/null | head -5 || echo "NO SESSION DIR"');
        console.log("Session-bot dir:", sessBot.stdout);

        // What does the bot source currently show for phone filter?
        console.log("=== Full bot source (critical lines) ===");
        const src = await ssh.execCommand('cat /opt/crm-cannabis/bot-wa.js');
        console.log(src.stdout);

        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
freshQR();
