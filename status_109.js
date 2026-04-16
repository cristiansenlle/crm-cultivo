const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
    const res = await ssh.execCommand('pm2 status bot_agronomy_server');
    console.log(res.stdout);
    ssh.dispose();
}
run().catch(console.error);
