const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function getTunnelUrl() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const res = await ssh.execCommand('grep -i "n8n.cloud" /root/.pm2/logs/n8n-service-out.log | tail -n 5');
        console.log("Found n8n.cloud tunnel URLs:");
        console.log(res.stdout || "None found.");
        
        const res2 = await ssh.execCommand('grep -i "tunnel" /root/.pm2/logs/n8n-service-out.log | tail -n 5');
        console.log("\nFound tunnel mentions:");
        console.log(res2.stdout || "None found.");

        ssh.dispose();
    } catch(e) {
        console.error(e);
        ssh.dispose();
    }
}
getTunnelUrl();
