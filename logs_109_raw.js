const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
    const res = await ssh.execCommand('cat ~/.pm2/logs/bot-agronomy-server-out.log | tail -n 100');
    console.log("OUT LOG:", res.stdout);
    const resErr = await ssh.execCommand('cat ~/.pm2/logs/bot-agronomy-server-error.log | tail -n 100');
    console.log("ERR LOG:", resErr.stdout);
    ssh.dispose();
}
run().catch(console.error);
