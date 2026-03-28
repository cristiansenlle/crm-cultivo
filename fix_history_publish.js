const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fixHistory() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log("Adding dummy row to workflow_history...");
        // Get schema
        let schemaRes = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite ".schema workflow_history"');
        console.log("History Schema:", schemaRes.stdout);

        // CREATE TABLE "workflow_history"("versionId" varchar(36) PRIMARY KEY NOT NULL, "workflowId" varchar(128) NOT NULL, ... "authors" text NOT NULL, "createdAt" datetime NOT NULL, "updatedAt" datetime NOT NULL)
        // Let's insert blindly
        const q = `INSERT INTO workflow_history (versionId, workflowId, authors, createdAt, updatedAt) VALUES ('2998cacd-6008-476a-b25b-b0c472316cd9', 'scpZdPe5Cp4MG98G', '[]', datetime('now'), datetime('now'));`;
        console.log("Executing:", q);
        let res = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "${q}"`);
        console.log("DB Insert Output:", res.stdout, res.stderr);

        console.log("Updating publishedVersionId pointer in workflow_entity just in case...");
        await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "UPDATE workflow_entity SET versionId='2998cacd-6008-476a-b25b-b0c472316cd9' WHERE id='scpZdPe5Cp4MG98G';"`);

        console.log("Running N8N publish CLI again...");
        let cli = await ssh.execCommand('n8n publish:workflow --id=scpZdPe5Cp4MG98G');
        console.log("CLI Result:", cli.stdout, cli.stderr);

        console.log("Restarting PM2...");
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

fixHistory();
