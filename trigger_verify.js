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
            temp: 22.2,
            humidity: 55,
            vpd: 1.0,
            timestamp: new Date().toISOString()
        };
        
        const triggerRes = await ssh.execCommand(`curl -X POST http://localhost:5678/webhook/telemetry -H "Content-Type: application/json" -d '${JSON.stringify(payload)}'`);
        console.log('Webhook Response:', triggerRes.stdout || triggerRes.stderr);

        // Wait a bit for execution to finish
        await new Promise(r => setTimeout(r, 2000));

        console.log('\n--- Checking Latest Execution ---');
        const resDb = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, status, resultData FROM execution_entity ORDER BY stoppedAt DESC LIMIT 1;"');
        console.log(resDb.stdout);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
})();
