const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function debugN8nServer() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod' 
        });

        console.log('--- Workflow Analysis ---');
        const res = await ssh.execCommand('sqlite3 -json /root/.n8n/database.sqlite "SELECT id, name, active, updatedAt, nodes FROM workflow_entity;"');
        
        if (res.stderr) {
            console.error('SQLite Error:', res.stderr);
        }

        const workflows = JSON.parse(res.stdout || '[]');
        workflows.forEach(w => {
            console.log(`\nWorkflow: ${w.name} (ID: ${w.id})`);
            console.log(`- Active: ${w.active}`);
            console.log(`- Updated: ${w.updatedAt}`);
            
            try {
                const nodes = JSON.parse(w.nodes);
                const agents = nodes.filter(n => n.name && n.name.includes('AI Agent'));
                agents.forEach(agent => {
                    const iters = agent.parameters?.options?.maxIterations;
                    console.log(`  > ${agent.name}: maxIterations = ${iters}`);
                });

                const webhooks = nodes.filter(n => n.type === 'n8n-nodes-base.webhook');
                webhooks.forEach(wh => {
                    console.log(`  > Webhook Node: ${wh.name} | Webhook ID: ${wh.webhookId}`);
                });
            } catch (e) {
                console.log('  > Could not parse nodes JSON');
            }
        });

        console.log('\n--- PM2 Logs (last 20 lines) ---');
        const logsRes = await ssh.execCommand('pm2 logs n8n-service --lines 20 --nostream');
        console.log(logsRes.stdout);

        ssh.dispose();
    } catch (err) {
        console.error('Debug failed:', err.message);
    }
}

debugN8nServer();
