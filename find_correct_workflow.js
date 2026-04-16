const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function findCorrectWorkflow() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'HIDDEN_SECRET_BY_AI' 
        });

        console.log('Fetching workflows...');
        const res = await ssh.execCommand('sqlite3 -json /root/.n8n/database.sqlite "SELECT id, name, nodes FROM workflow_entity;"');
        
        const workflows = JSON.parse(res.stdout || '[]');
        workflows.forEach(w => {
            console.log(`\nChecking Workflow: ${w.id}`);
            const nodes = JSON.parse(w.nodes);
            
            const hasExecuteCommand = nodes.some(n => n.type === 'n8n-nodes-base.executeCommand');
            const hasBypassPG = nodes.some(n => n.name === 'Bypass PG');
            const webhookWhatsApp = nodes.find(n => n.name === 'Webhook WhatsApp');
            
            console.log(`- hasExecuteCommand: ${hasExecuteCommand}`);
            console.log(`- hasBypassPG: ${hasBypassPG}`);
            if (webhookWhatsApp) {
                console.log(`- Webhook WhatsApp ID: ${webhookWhatsApp.webhookId}`);
                console.log(`- Webhook WhatsApp Path: ${webhookWhatsApp.parameters?.path}`);
            } else {
                console.log('- No "Webhook WhatsApp" node found');
            }
        });

        ssh.dispose();
    } catch (err) {
        console.error('Find failed:', err.message);
    }
}

findCorrectWorkflow();
