const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log('--- Triggering Webhook ---');
        const payload = {
            batch_id: 'sala1',
            temp: 25,
            humidity: 50,
            vpd: 1.2,
            timestamp: new Date().toISOString()
        };
        
        // Trigger the webhook
        const triggerRes = await ssh.execCommand(`curl -X POST http://localhost:5678/webhook/telemetry -H "Content-Type: application/json" -d '${JSON.stringify(payload)}'`);
        console.log('Response:', triggerRes.stdout || triggerRes.stderr);

        // Immediately check for any new logs or active executions
        console.log('\n--- Checking n8n Executions ---');
        const resDb = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, status, resultData FROM execution_entity ORDER BY stoppedAt DESC LIMIT 1;"');
        console.log(resDb.stdout);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
})();
