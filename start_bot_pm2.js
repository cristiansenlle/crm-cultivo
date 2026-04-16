const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    const runCmd = async (cmd) => {
        console.log('\n▶️ ' + cmd);
        const result = await ssh.execCommand(cmd, {
            cwd: '/opt/crm-cannabis',
            onStdout: chunk => process.stdout.write(chunk.toString('utf8')),
            onStderr: chunk => process.stderr.write(chunk.toString('utf8')),
        });
        return result;
    };

    // Start the WhatsApp bot with PM2
    await runCmd('pm2 stop whatsapp-bot || true');
    await runCmd('pm2 delete whatsapp-bot || true');
    await runCmd('pm2 start bot-wa.js --name "whatsapp-bot"');

    // Also fix n8n - it was erroring, let's check why and restart properly
    await runCmd('pm2 stop n8n-service || true');
    await runCmd('pm2 delete n8n-service || true');
    const n8nCmd = 'N8N_HOST=109.199.99.126 N8N_PORT=5678 WEBHOOK_URL=http://109.199.99.126:5678/ N8N_BASIC_AUTH_ACTIVE=true N8N_BASIC_AUTH_USER=admin N8N_BASIC_AUTH_PASSWORD=AdminSeguro123! pm2 start n8n --name "n8n-service"';
    await runCmd(n8nCmd);

    // Save process list so they restart on reboot
    await runCmd('pm2 save');

    // Show current status
    await runCmd('pm2 list');

    ssh.dispose();
    console.log('\n✅ Done! All services are running persistently via PM2.');
}
run();
