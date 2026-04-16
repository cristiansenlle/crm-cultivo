const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkWorkflowNodes() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'HIDDEN_SECRET_BY_AI' 
        });

        const targetId = 'scpZdPe5Cp4MG98G';
        
        console.log(`--- Fetching nodes for workflow ${targetId} ---`);
        const res = await ssh.execCommand(`sqlite3 -json /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id = '${targetId}';"`);
        
        if (!res.stdout) {
            console.log('No data found for ID', targetId);
            return;
        }

        const rows = JSON.parse(res.stdout);
        const nodes = JSON.parse(rows[0].nodes);
        console.log('Nodes in workflow:', nodes.map(n => n.name).join(', '));

        const waNode = nodes.find(n => n.name.toLowerCase().includes('whatsapp') && n.type.includes('send'));
        if (waNode) {
            console.log('WhatsApp Send node found:', waNode.name);
        } else {
            console.log('WARNING: No WhatsApp send node found in the workflow!');
        }

        ssh.dispose();
    } catch (err) {
        console.error('Check failed:', err.message);
    }
}

checkWorkflowNodes();
