const { NodeSSH } = require('node-ssh');
const path = require('path');

const ssh = new NodeSSH();

async function deploy() {
    try {
        console.log('--- Iniciando Despliegue a Contabo ---');
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log('✅ Conectado al servidor.');

        const remotePath = '/opt/crm-cannabis';
        const filesToUpload = [
            'main.js',
            'cultivo.js',
            'agronomy.js',
            'cultivo.html'
        ];

        for (const file of filesToUpload) {
            const localFile = path.join(__dirname, file);
            console.log(`🚀 Subiendo ${file}...`);
            await ssh.putFile(localFile, `${remotePath}/${file}`);
        }

        console.log('✅ Archivos subidos con éxito.');

        console.log('🔄 Reiniciando crm-frontend en PM2...');
        const result = await ssh.execCommand('pm2 restart crm-frontend', { cwd: remotePath });
        
        if (result.stdout) console.log('STDOUT:', result.stdout);
        if (result.stderr) console.error('STDERR:', result.stderr);

        console.log('🎉 Despliegue completado satisfactoriamente.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error durante el despliegue:', err);
        process.exit(1);
    }
}

deploy();
