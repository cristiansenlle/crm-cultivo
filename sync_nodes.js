const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function syncNodes() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log("Syncing nodes from workflow_entity to workflow_history...");
        const q = `UPDATE workflow_history SET nodes=(SELECT nodes FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G'), connections=(SELECT connections FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G') WHERE versionId='2998cacd-6008-476a-b25b-b0c472316cd9';`;
        let res = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "${q}"`);
        console.log("DB Update Output:", res.stdout, res.stderr);

        console.log("Restarting n8n-service...");
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

syncNodes();
