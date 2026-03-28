const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function listWorkflows() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod' 
        });

        console.log('--- Listing Workflows (Raw) ---');
        // We use a simpler query without -json to be very compatible
        const res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, name, active FROM workflow_entity;"');
        console.log(res.stdout);

        ssh.dispose();
    } catch (err) {
        console.error('List failed:', err.message);
    }
}

listWorkflows();
