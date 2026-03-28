const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    const runCmd = async (cmd) => {
        console.log('\n▶️ ' + cmd);
        const result = await ssh.execCommand(cmd, {
            onStdout: chunk => process.stdout.write(chunk.toString('utf8')),
            onStderr: chunk => process.stderr.write(chunk.toString('utf8')),
        });
        return result;
    };

    // Stop the frontend
    await runCmd('pm2 stop crm-frontend');
    await runCmd('pm2 delete crm-frontend');

    // Restart WITHOUT the -s (SPA mode) flag
    // Without -s, serve will serve each .html file correctly without redirecting everything to index.html
    await runCmd('cd /opt/crm-cannabis && pm2 start "serve . -l 3000" --name "crm-frontend"');

    await runCmd('pm2 save');
    await runCmd('pm2 list');

    ssh.dispose();
    console.log('\n✅ Done! Frontend is now in multi-page mode.');
}
run();
