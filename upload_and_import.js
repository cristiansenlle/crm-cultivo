const { NodeSSH } = require('node-ssh');
const fs = require('fs');

const ssh = new NodeSSH();

async function deployPatched() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log("1. Uploading patched_export.json...");
        await ssh.putFile('patched_export.json', '/root/patched_export.json');

        console.log("2. Stopping n8n-service...");
        await ssh.execCommand('pm2 stop n8n-service');

        // Clearing execution history to completely destroy lingering traces of "sala 1"
        console.log("3. Wiping execution trace history in SQLite...");
        await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "DELETE FROM execution_data;"');
        await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "DELETE FROM execution_entity;"');

        console.log("4. Importing workflow to N8N...");
        // This command overwrites the original scpZdPe5Cp4MG98G with our sanitized version
        let res = await ssh.execCommand('n8n import:workflow --input=/root/patched_export.json');
        console.log("Import Output:", res.stdout, res.stderr);

        console.log("5. Starting n8n-service...");
        await ssh.execCommand('pm2 start n8n-service');

        console.log("Deployment complete.");
        ssh.dispose();
    } catch (e) {
        console.error(e);
        ssh.dispose();
    }
}

deployPatched();
