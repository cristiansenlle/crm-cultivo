const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function forceActivate() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        // 1. Force the active flag in the DB
        console.log("Setting active=1 for workflow scpZdPe5Cp4MG98G in database...");
        let dbRes = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "UPDATE workflow_entity SET active=1 WHERE id=\'scpZdPe5Cp4MG98G\';"');
        console.log("DB update:", dbRes.stdout, dbRes.stderr);

        // 2. Also run the recommended CLI command (publish:workflow) to ensure N8N's cache or triggers register it
        console.log("Running n8n publish:workflow...");
        let cliRes = await ssh.execCommand('n8n publish:workflow --id=scpZdPe5Cp4MG98G');
        console.log("CLI publish:", cliRes.stdout, cliRes.stderr);

        // 3. Restart N8N
        console.log("Restarting n8n-service...");
        await ssh.execCommand('pm2 restart n8n-service');

        console.log("Done. Waiting 15s to allow N8N webhook to bind...");
        await new Promise(r => setTimeout(r, 15000));

        ssh.dispose();
    } catch (e) {
        console.error("Error:", e);
        ssh.dispose();
    }
}

forceActivate();
