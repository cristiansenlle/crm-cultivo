const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log("Importing workflow...");
    let importRes = await ssh.execCommand('n8n import:workflow --input=/root/temp_db_deploy.json');
    console.log("Import STDOUT:", importRes.stdout);
    if(importRes.stderr) console.error("Import STDERR:", importRes.stderr);
    
    // Extract ID from output like "Successfully imported 1 workflow. ID: 4"
    let match = importRes.stdout.match(/Successfully imported workflow ".*?" \(ID: (\w+)\)/) || importRes.stdout.match(/ID: (\w+)/);
    let wfId = null;
    if (match && match[1]) {
        wfId = match[1];
        console.log("Extracted Workflow ID:", wfId);
    } else {
        // Find it via sqlite
        let dbRes = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id FROM workflow_entity WHERE name = \\\'DB Deploy\\\' ORDER BY \\"createdAt\\" DESC LIMIT 1;"');
        wfId = dbRes.stdout.trim();
        console.log("Found ID via sqlite:", wfId);
    }

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
