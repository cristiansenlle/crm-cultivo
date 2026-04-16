const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
        console.log("Iniciando N8N con pm2...");
        const res = await ssh.execCommand('pm2 start n8n --name n8n');
        console.log(res.stdout);
        const res2 = await ssh.execCommand('pm2 save');
        ssh.dispose();
    } catch(e) {
        console.error(e);
    }
}
run();
