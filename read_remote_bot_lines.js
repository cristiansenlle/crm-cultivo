const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
        const res = await ssh.execCommand('cat -n /opt/crm-cannabis/bot-wa.js');
        console.log("=== REMOTE SOURCE WITH LINE NUMBERS ===");
        console.log(res.stdout);
        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
check();
