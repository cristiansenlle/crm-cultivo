const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    const host = '109.199.99.126';
    const username = 'root';
    const pwd = 'FVRu0i2XiWUP93OtQfI7LvPKod';
    const localZip = 'C:\\\\Users\\\\Cristian\\\\.gemini\\\\antigravity\\\\crm_cannabis_backup_20260303_184235.zip';
    const remoteZip = '/root/crm_cannabis_backup_20260303_184235.zip';

    console.log('Connecting to ' + host + '...');
    try {
        await ssh.connect({
            host,
            username,
            password: pwd,
            readyTimeout: 10000
        });
        console.log('✅ Connected successfully with root!');
    } catch (e) {
        console.error('❌ Failed.');
        return;
    }

    const runCmd = async (cmd) => {
        console.log('\\n▶️ Running: ' + cmd.substring(0, 50) + '...');
        const result = await ssh.execCommand(cmd, {
            cwd: '/root',
            onStdout: chunk => process.stdout.write(chunk.toString('utf8')),
            onStderr: chunk => process.stderr.write(chunk.toString('utf8')),
        });
        return result;
    };

    try {
        console.log('\\n▶️ Uploading ZIP... (This may take a few minutes for 93MB)');
        await ssh.putFile(localZip, remoteZip);
        console.log('✅ ZIP uploaded successfully!');

        await runCmd('unzip -o ' + remoteZip + ' -d /opt/crm-cannabis');
        console.log('Installing bot dependencies on server...');
        await runCmd('cd /opt/crm-cannabis && npm install');

        const n8nEnv = 'export N8N_HOST=' + host + ' && export WEBHOOK_URL=http://' + host + ':5678/ && export N8N_BASIC_AUTH_ACTIVE=true && export N8N_BASIC_AUTH_USER=admin && export N8N_BASIC_AUTH_PASSWORD=AdminSeguro123!';
        await runCmd(n8nEnv + ' && pm2 start "n8n start" --name "n8n-service" --interpreter bash');

        await runCmd('cd /opt/crm-cannabis && pm2 start "serve -s . -l 3000" --name "crm-frontend"');
        await runCmd('pm2 save && pm2 startup');

        console.log('\\n🚀 ALL DONE! Server is provisioned. N8N and Frontend are running.');
    } catch (err) {
        console.error('Error during deployment:', err);
    } finally {
        ssh.dispose();
    }
}
run();
