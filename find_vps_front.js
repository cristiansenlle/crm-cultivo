const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
    const res = await ssh.execCommand('find / -name "insumos*" -o -name "style.css" | grep -v node_modules | head -n 20');
    console.log("Files:", res.stdout);
    ssh.dispose();
}
run().catch(console.error);
