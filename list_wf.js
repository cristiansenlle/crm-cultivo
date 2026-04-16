const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function getWorkflows() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const res1 = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, name FROM workflow_entity;"');
        console.log("Workflows:\n" + res1.stdout);

        // Download the active one that has "WhatsApp" in its name or is the AI agent workflow
        // To find which workflow has the toolHttpRequest nodes:
        const searchNodes = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, name FROM workflow_entity WHERE nodes LIKE \'%toolHttpRequest%\';"');
        console.log("\nWorkflows with toolHttpRequest:\n" + searchNodes.stdout);

        if (searchNodes.stdout) {
             const wfId = searchNodes.stdout.split('|')[0].trim();
             const dump = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id='${wfId}';"`);
             fs.writeFileSync('target_ai_workflow.json', dump.stdout);
             console.log(`Saved nodes for ${wfId} to target_ai_workflow.json`);
        }

        ssh.dispose();
    } catch(e) {
        console.error(e);
        ssh.dispose();
    }
}
getWorkflows();
