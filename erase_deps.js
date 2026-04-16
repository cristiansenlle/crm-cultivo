const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function eraseDeps() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log("Erasing workflow dependencies and history for scpZdPe5Cp4MG98G...");
        let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "DELETE FROM workflow_dependency WHERE workflowId=\'scpZdPe5Cp4MG98G\'; DELETE FROM workflow_history WHERE workflowId=\'scpZdPe5Cp4MG98G\';"');
        console.log("Erased:", res.stdout, res.stderr);

        console.log("Restarting n8n-service...");
        await ssh.execCommand('pm2 restart n8n-service');

        console.log("Waiting 15s for N8N webhooks to bind...");
        await new Promise(r => setTimeout(r, 15000));

        console.log("Running test_actual_fresh.js locally...");
        require('child_process').execSync('node test_actual_fresh.js', { stdio: 'inherit' });

        console.log("Done!");
        ssh.dispose();
    } catch (e) {
        console.error("Error:", e);
        ssh.dispose();
    }
}

eraseDeps();
