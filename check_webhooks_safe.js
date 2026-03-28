const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkWebhooks() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod' 
        });

        const db = '/root/.n8n/database.sqlite';
        const res = await ssh.execCommand(`sqlite3 -json ${db} "SELECT * FROM webhook_entity WHERE webhookPath = 'wa-inbound'"`);
        console.log('Webhooks:', res.stdout);
        ssh.dispose();
    } catch (err) {
        console.error('Check webhooks failed:', err.message);
    }
}

checkWebhooks();
