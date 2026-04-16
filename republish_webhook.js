const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function republish() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log("Deactivating workflow first to clear webhook ghosts...");
        await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "UPDATE workflow_entity SET active=0 WHERE id=\'scpZdPe5Cp4MG98G\'; DELETE FROM webhook_entity WHERE workflowId=\'scpZdPe5Cp4MG98G\';"');

        console.log("Bouncing N8N to unload old state...");
        await ssh.execCommand('pm2 restart n8n-service');
        await new Promise(r => setTimeout(r, 8000));

        console.log("Running N8N CLI to cleanly publish the workflow...");
        let cliRes = await ssh.execCommand('n8n publish:workflow --id=scpZdPe5Cp4MG98G');
        console.log("CLI Output:", cliRes.stdout, cliRes.stderr);

        console.log("Restarting N8N for changes to take effect...");
        await ssh.execCommand('pm2 restart n8n-service');
        await new Promise(r => setTimeout(r, 15000));

        console.log("Testing API...");
        require('child_process').execSync('node test_actual_fresh.js', { stdio: 'inherit' });

        console.log("Done!");
        ssh.dispose();
    } catch (e) {
        console.error("Error:", e);
        ssh.dispose();
    }
}

republish();
