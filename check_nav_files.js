const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkNavFiles() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log('\\n--- Archivos en /opt/crm-cannabis ---');
        const ls = await ssh.execCommand('ls -la /opt/crm-cannabis');
        console.log(ls.stdout);

        console.log('\\n--- PM2 Command Args ---');
        const args = await ssh.execCommand('pm2 jlist | jq ".[0].pm2_env.args"');
        console.log(args.stdout);

        ssh.dispose();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkNavFiles();
