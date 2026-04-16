const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fixCors() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log('Restarting n8n with CORS globally allowed...');

        // We export the variable and restart the process with --update-env
        const cmd = `export N8N_CORS_ALLOWED_ORIGINS="*" && pm2 restart n8n-service --update-env`;
        const res = await ssh.execCommand(cmd);
        console.log(res.stdout);

        // Save PM2 layout
        await ssh.execCommand('pm2 save');

        console.log('✅ N8N CORS fixed.');
        ssh.dispose();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

fixCors();
