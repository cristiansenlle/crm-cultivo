const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        const res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id=\'scpZdPe5Cp4MG98G\';"');
        const nodes = JSON.parse(res.stdout);
        
        console.log('--- All Workflow Nodes ---');
        nodes.forEach(n => {
            console.log(`Name: ${n.name}, Type: ${n.type}, ID: ${n.id}`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
})();
