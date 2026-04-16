const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function runPreventions() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log('--- Applying Preventions to N8N ---');
        const n8nCommands = `
pm2 delete n8n-service
export N8N_HOST=109.199.99.126
export WEBHOOK_URL=http://109.199.99.126:5678/
export N8N_BASIC_AUTH_ACTIVE=true
export N8N_BASIC_AUTH_USER=admin
export N8N_BASIC_AUTH_PASSWORD=AdminSeguro123!
export EXECUTIONS_DATA_PRUNE=true
export EXECUTIONS_DATA_MAX_AGE=48
export EXECUTIONS_DATA_PRUNE_MAX_COUNT=500
export DB_SQLITE_VACUUM_ON_STARTUP=true
pm2 start n8n --name "n8n-service" -- start
        `;
        let res1 = await ssh.execCommand(n8nCommands);
        console.log('N8N Updates:', res1.stdout, res1.stderr);

        console.log('--- Applying Preventions to WA Bot ---');
        const waCommands = `
pm2 stop whatsapp-bot
pm2 delete whatsapp-bot
pm2 start /opt/crm-cannabis/bot-wa.js --name "whatsapp-bot" --cron "0 4 * * *"
pm2 save
        `;
        let res2 = await ssh.execCommand(waCommands);
        console.log('WA Bot Updates:', res2.stdout, res2.stderr);

        ssh.dispose();
    } catch (e) {
        console.error('Error applying preventions:', e.message);
    }
}

runPreventions();
