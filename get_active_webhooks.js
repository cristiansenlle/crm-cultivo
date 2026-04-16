const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function getWebhooks() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'HIDDEN_SECRET_BY_AI' 
        });

        console.log('--- Fetching Active Webhooks ---');
        const res = await ssh.execCommand('sqlite3 -json /root/.n8n/database.sqlite "SELECT workflowId, path, method, webhookId FROM webhook_entity;"');
        
        console.log(res.stdout);

        ssh.dispose();
    } catch (err) {
        console.error('Fetch failed:', err.message);
    }
}

getWebhooks();
