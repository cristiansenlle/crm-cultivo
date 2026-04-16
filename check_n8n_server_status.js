const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkN8nStatus() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'HIDDEN_SECRET_BY_AI' 
        });

        console.log('Checking workflow status in SQLite...');
        const res = await ssh.execCommand('sqlite3 -json /root/.n8n/database.sqlite "SELECT id, name, active, nodes FROM workflow_entity;"');
        
        if (res.stderr) {
            console.error('Error executing sqlite3:', res.stderr);
        }

        const workflows = JSON.parse(res.stdout || '[]');
        console.log(`Found ${workflows.length} workflows:`);
        
        workflows.forEach(w => {
            console.log(`- ID: ${w.id} | Name: ${w.name} | Active: ${w.active}`);
            
            // Extract webhook information if present in nodes
            try {
                const nodes = JSON.parse(w.nodes);
                const webhookNodes = nodes.filter(n => n.type === 'n8n-nodes-base.webhook');
                if (webhookNodes.length > 0) {
                    webhookNodes.forEach(wn => {
                        console.log(`  > Webhook: ${wn.name} | ID: ${wn.webhookId || 'N/A'}`);
                    });
                }
            } catch (e) {
                console.log('  > Could not parse nodes JSON');
            }
        });

        ssh.dispose();
    } catch (err) {
        console.error('Check failed:', err.message);
    }
}

checkN8nStatus();
