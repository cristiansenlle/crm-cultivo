const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

async function run() {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
        const res1 = await ssh.execCommand('systemctl status docker');
        const res2 = await ssh.execCommand('systemctl status n8n');
        const res3 = await ssh.execCommand('ls -l /root/');
        fs.writeFileSync('n8n_logs.txt', res1.stdout + "\n---\n" + res2.stdout + "\n---\n" + res1.stderr + "\n---\n" + res3.stdout);
        ssh.dispose();
    } catch(e) {}
}
run();
