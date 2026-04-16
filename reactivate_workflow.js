const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function reactivate() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        // First check if workflow is active in the DB
        console.log("=== Checking workflow active state ===");
        const wfState = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, name, active FROM workflow_entity WHERE id=\'scpZdPe5Cp4MG98G\';"');
        console.log(wfState.stdout);

        // Test the correct webhook path
        console.log("\n=== Testing wa-inbound webhook ===");
        const test = await ssh.execCommand('curl -s -X POST http://localhost:5678/webhook/wa-inbound -H "Content-Type: application/json" -d \'{"Body":"test","From":"5491156548820"}\' -w "\\nHTTP:%{http_code}"');
        console.log(test.stdout);

        // If 404, try to activate via API
        if (test.stdout.includes('"code":404') || test.stdout.includes('HTTP:404')) {
            console.log("\n=== Workflow is inactive - activating via N8N API ===");
            
            // First get auth token
            const loginRes = await ssh.execCommand('curl -s -X POST http://localhost:5678/rest/login -H "Content-Type: application/json" -d \'{"email":"admin@crm-cannabis.com","password":"admin123"}\'');
            console.log("Login response:", loginRes.stdout.substring(0, 200));

            // Try to activate workflow directly via SQLite
            await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "UPDATE workflow_entity SET active=1 WHERE id=\'scpZdPe5Cp4MG98G\';"');
            console.log("Set active=1 in SQLite");

            // Restart n8n-service to pick up the change
            console.log("Restarting n8n-service...");
            await ssh.execCommand('pm2 restart n8n-service');
            
            // Wait a bit then test again
            await new Promise(r => setTimeout(r, 8000));
            
            const test2 = await ssh.execCommand('curl -s -X POST http://localhost:5678/webhook/wa-inbound -H "Content-Type: application/json" -d \'{"Body":"test","From":"5491156548820"}\' -w "\\nHTTP:%{http_code}"');
            console.log("After restart test:", test2.stdout.substring(0, 300));
        }

        console.log("\n=== Final PM2 status ===");
        const pm2 = await ssh.execCommand('pm2 list');
        console.log(pm2.stdout);

        ssh.dispose();
    } catch(e) {
        console.error("Error:", e.message);
        if (ssh) ssh.dispose();
    }
}
reactivate();
