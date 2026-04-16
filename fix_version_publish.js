const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fixVersionAndPublish() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log("Setting publishedVersionId to NULL...");
        await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "UPDATE workflow_entity SET active=0, publishedVersionId=NULL WHERE id=\'scpZdPe5Cp4MG98G\';"');

        console.log("Restarting PM2...");
        await ssh.execCommand('pm2 restart n8n-service');
        await new Promise(r => setTimeout(r, 10000));

        console.log("Publishing via N8N CLI...");
        let cliRes = await ssh.execCommand('n8n publish:workflow --id=scpZdPe5Cp4MG98G');
        console.log("CLI Output:", cliRes.stdout, cliRes.stderr);

        console.log("Restarting PM2 again to load the newly activated webhook...");
        await ssh.execCommand('pm2 restart n8n-service');
        await new Promise(r => setTimeout(r, 15000));

        console.log("Testing API...");
        require('child_process').execSync('node test_actual_fresh.js', { stdio: 'inherit' });

        ssh.dispose();
    } catch (e) {
        console.error("Error:", e);
        ssh.dispose();
    }
}

fixVersionAndPublish();
