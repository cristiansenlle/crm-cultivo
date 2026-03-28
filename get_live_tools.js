const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function getWorkflow() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        const res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id=\'scpZdPe5Cp4MG98G\'"');
        fs.writeFileSync('live_whatsapp_workflow_nodes.json', res.stdout);
        console.log("Written to live_whatsapp_workflow_nodes.json");
        
        // Also fetch the rooms/locations directly
        const dbRes = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT * FROM workflow_entity LIMIT 1"'); // just testing connection
        
        ssh.dispose();
    } catch(e) {
        console.error(e);
        ssh.dispose();
    }
}
getWorkflow();
