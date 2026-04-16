const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkFilter() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        // Get the full message handler from bot-wa.js
        console.log("=== Full bot-wa.js message handler ===");
        const src = await ssh.execCommand('cat /opt/crm-cannabis/bot-wa.js');
        console.log(src.stdout);

        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
checkFilter();
