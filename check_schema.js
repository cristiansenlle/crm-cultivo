const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkSchema() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod' 
        });

        const db = '/root/.n8n/database.sqlite';
        console.log(`--- Published Workflow Entries ---`);
        const resPub = await ssh.execCommand(`sqlite3 ${db} "SELECT workflowId, userId FROM workflow_published_version WHERE workflowId = 'scpZdPe5Cp4MG98G';"`);
        console.log(resPub.stdout);

        ssh.dispose();
    } catch (err) {
        console.error('Check failed:', err.message);
    }
}

checkSchema();
