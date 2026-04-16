const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
    
    await ssh.getFile('nginx_insumos.js', '/var/www/html/insumos.js');
    await ssh.getFile('nginx_style.css', '/var/www/html/style.css');
    await ssh.getFile('nginx_insumos.html', '/var/www/html/insumos.html');
    
    console.log("Archivos front-end nginx descargados para editar.");
    ssh.dispose();
}
run().catch(console.error);
