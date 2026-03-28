const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    const runCmd = async (label, cmd) => {
        console.log(`\n▶️ ${label}`);
        const r = await ssh.execCommand(cmd);
        if (r.stdout) console.log(r.stdout);
        if (r.stderr && r.stderr.trim()) console.log('ERR:', r.stderr.substring(0, 300));
        return r;
    };

    // 1. Añadimos la variable al entorno de PM2 para N8N y reiniciamos
    console.log('\n🔥 Actualizando N8N para deshabilitar las cookies seguras (N8N_SECURE_COOKIE=false)...');

    await runCmd('Update Env and Restart', 'N8N_SECURE_COOKIE=false WEBHOOK_URL=http://109.199.99.126:5678 pm2 restart n8n-service --update-env');

    await runCmd('Save PM2 state', 'pm2 save');

    // Verify the environment variable was set
    await runCmd('Verify environment', 'pm2 env n8n-service | grep -i "N8N_"');

    await runCmd('Wait for N8N to restart', 'sleep 10');

    await runCmd('Check N8N Logs', 'pm2 logs n8n-service --lines 15 --nostream');

    ssh.dispose();
}
run();
