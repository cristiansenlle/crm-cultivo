const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function deployFrontend() {
    console.log('--- Desplegando Frontend al Servidor de Producción ---');
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });
        console.log('✅ Conexión SSH establecida con 109.199.99.126');

        const localHtml = path.join(__dirname, 'cultivo.html');
        const localJs = path.join(__dirname, 'cultivo.js');
        const remoteHtml = '/opt/crm-cannabis/cultivo.html';
        const remoteJs = '/opt/crm-cannabis/cultivo.js';

        console.log('Subiendo cultivo.html...');
        await ssh.putFile(localHtml, remoteHtml);
        
        console.log('Subiendo cultivo.js...');
        await ssh.putFile(localJs, remoteJs);

        console.log('✅ Archivos subidos exitosamente.');
    } catch (err) {
        console.error('❌ Error durante el despliegue:', err);
    } finally {
        ssh.dispose();
    }
}

deployFrontend();
