const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log("Stopping n8n-service...");
    await ssh.execCommand('pm2 stop n8n-service');
    
    console.log("Executing SQL migration via n8n...");
    let res = await ssh.execCommand('n8n execute --file /root/temp_db_deploy.json');
    console.log(res.stdout);
    if(res.stderr) console.error("STDERR:", res.stderr);
    
    console.log("Starting n8n-service...");
    await ssh.execCommand('pm2 start n8n-service');
    
    ssh.dispose();
}
run().catch(console.error);
