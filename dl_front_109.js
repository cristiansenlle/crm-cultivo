const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
    await ssh.getFile('remote_insumos.html', '/opt/crm-cannabis/insumos.html');
    await ssh.getFile('remote_insumos.js', '/opt/crm-cannabis/insumos.js');
    await ssh.getFile('remote_style.css', '/opt/crm-cannabis/style.css');
    console.log("Descargados.");
    ssh.dispose();
}
run().catch(console.error);
