const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkServer() {
    try {
        console.log('Attempting to connect via SSH...');
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod',
            tryKeyboard: true,
            readyTimeout: 10000 // 10 seconds timeout
        });
        console.log('✅ SSH Connection Successful!');

        console.log('\\n--- PM2 Status ---');
        const pm2Status = await ssh.execCommand('pm2 status');
        console.log(pm2Status.stdout);

        console.log('\\n--- UFW (Firewall) Status ---');
        const ufwStatus = await ssh.execCommand('ufw status');
        console.log(ufwStatus.stdout);

        console.log('\\n--- Listening Ports ---');
        const ports = await ssh.execCommand('ss -tuln | grep -E "80|5678"');
        console.log(ports.stdout);

        ssh.dispose();
    } catch (error) {
        console.error('❌ SSH Connection Failed:', error.message);
    }
}

checkServer();
