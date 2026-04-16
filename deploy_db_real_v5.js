const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
    console.log("Stopping n8n-service...");
    await ssh.execCommand('pm2 stop n8n-service');
        
    console.log("Executing SQL migration via n8n by ID...");
    let execRes = await ssh.execCommand('n8n execute --id=NsUXAT5DMiZksygW');
    console.log("Exec STDOUT:", execRes.stdout.substring(0,2500));
    if(execRes.stderr) console.error("Exec STDERR:", execRes.stderr);
        
    console.log("Starting n8n-service...");
    await ssh.execCommand('pm2 start n8n-service');
    ssh.dispose();
}
run().catch(console.error);
