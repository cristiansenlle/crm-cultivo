const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function bypassCrash() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log("Replacing executeCommand with noOp in SQLite...");
        let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "UPDATE workflow_entity SET nodes = REPLACE(nodes, \'n8n-nodes-base.executeCommand\', \'n8n-nodes-base.noOp\') WHERE id=\'scpZdPe5Cp4MG98G\';"');
        console.log(res.stdout, res.stderr);

        console.log("Restarting n8n-service...");
        await ssh.execCommand('pm2 restart n8n-service');

        console.log("Waiting 15s for N8N webhooks to bind...");
        await new Promise(r => setTimeout(r, 15000));

        console.log("Done!");
        ssh.dispose();
    } catch (e) {
        console.error("Error:", e);
        ssh.dispose();
    }
}

bypassCrash();
