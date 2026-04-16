const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
        console.log("Reiniciando N8N deshaciendo cookie string...");
        await ssh.execCommand('pm2 delete n8n');
        const res = await ssh.execCommand('N8N_SECURE_COOKIE=false pm2 start n8n --name n8n');
        console.log(res.stdout);
        const res2 = await ssh.execCommand('pm2 save');
        ssh.dispose();
    } catch(e) {
        console.error(e);
    }
}
run();
