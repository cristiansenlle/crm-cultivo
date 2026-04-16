const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    const runCmd = async (cmd) => {
        console.log('\\n▶️ Running: ' + cmd);
        const result = await ssh.execCommand(cmd, {
            cwd: '/root',
            onStdout: chunk => process.stdout.write(chunk.toString('utf8')),
            onStderr: chunk => process.stderr.write(chunk.toString('utf8')),
        });
        return result;
    };

    // Move files up
    await runCmd('mv /opt/crm-cannabis/backups/backup_2026-03-03_13-19-00/* /opt/crm-cannabis/ || true');
    await runCmd('mv /opt/crm-cannabis/backups/backup_2026-03-03_13-19-00/.* /opt/crm-cannabis/ 2>/dev/null || true');

    // Install
    await runCmd('cd /opt/crm-cannabis && npm install');

    // Stop previous instances if any
    await runCmd('pm2 stop all || true');
    await runCmd('pm2 delete all || true');

    // Start n8n and frontend
    const n8nEnv = 'export N8N_HOST=109.199.99.126 && export WEBHOOK_URL=http://109.199.99.126:5678/ && export N8N_BASIC_AUTH_ACTIVE=true && export N8N_BASIC_AUTH_USER=admin && export N8N_BASIC_AUTH_PASSWORD=AdminSeguro123!';
    await runCmd(n8nEnv + ' && pm2 start "n8n start" --name "n8n-service" --interpreter bash');
    await runCmd('cd /opt/crm-cannabis && pm2 start "serve -s . -l 3000" --name "crm-frontend"');
    await runCmd('pm2 save');

    ssh.dispose();
}
run();
