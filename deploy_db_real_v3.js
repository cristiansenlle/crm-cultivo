const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    let dbRes = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, name FROM workflow_entity;"');
    console.log("All workflows:", dbRes.stdout);
    
    // Find the ID of the 'DB Deploy' workflow
    let lines = dbRes.stdout.split('\n');
    let wfId = null;
    for(let l of lines) {
        if(l.includes('DB Deploy')) {
            wfId = l.split('|')[0];
        }
    }
    
    console.log("Found ID for 'DB Deploy':", wfId);

    if (wfId) {
        console.log("Stopping n8n-service...");
        await ssh.execCommand('pm2 stop n8n-service');
        
        console.log("Executing SQL migration via n8n by ID:", wfId);
        let execRes = await ssh.execCommand('n8n execute --id=' + wfId);
        console.log("Exec STDOUT:", execRes.stdout);
        if(execRes.stderr) console.error("Exec STDERR:", execRes.stderr);
        
        console.log("Starting n8n-service...");
        await ssh.execCommand('pm2 start n8n-service');
    }

    ssh.dispose();
}
run().catch(console.error);
