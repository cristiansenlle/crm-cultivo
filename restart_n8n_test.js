const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function restartN8N() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log("Restarting n8n-service...");
        let res = await ssh.execCommand('pm2 restart n8n-service');
        console.log(res.stdout);

        ssh.dispose();
    } catch (e) {
        console.error(e);
        ssh.dispose();
    }
}

restartN8N().catch(console.error);
