const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
    await ssh.getFile('page.tsx', '/opt/crm-cannabis-next/src/app/insumos/page.tsx');
    console.log("TSX descargado.");
    ssh.dispose();
}
run().catch(console.error);
