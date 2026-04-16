const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function inspect(id) {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'HIDDEN_SECRET_BY_AI' 
        });

        const db = '/root/.n8n/database.sqlite';
        const res = await ssh.execCommand(`sqlite3 -json ${db} "SELECT nodes FROM workflow_entity WHERE id = '${id}'"`);
        const result = JSON.parse(res.stdout);
        if (result.length > 0) {
            const nodes = JSON.parse(result[0].nodes);
            console.log(`Workflow ${id} has ${nodes.length} nodes.`);
            console.log('Node types sample:', [...new Set(nodes.map(n => n.type))].slice(0, 5));
        } else {
            console.log(`Workflow ${id} not found.`);
        }
        ssh.dispose();
    } catch (err) {
        console.error('Inspection failed:', err.message);
    }
}

inspect('yC1ekEMc12CkBmwH');
