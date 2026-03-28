const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
        const res = await ssh.execCommand('cat /opt/crm-cannabis/package.json');
        console.log("=== PACKAGE JSON ===");
        console.log(res.stdout);
        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
check();
