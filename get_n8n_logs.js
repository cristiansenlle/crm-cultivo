const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

async function getLogs() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });
        
        let pm2 = await ssh.execCommand('npx pm2 list || pm2 list');
        console.log("PM2:", pm2.stdout);
        
        let dock = await ssh.execCommand('docker ps -a');
        console.log("DOCKER:", dock.stdout);
    } catch (err) {
        console.error("SSH Error:", err);
    } finally {
        ssh.dispose();
    }
}
getLogs();
