const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

(async () => {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id=\'scpZdPe5Cp4MG98G\';"');
        const nodes = JSON.parse(res.stdout);
        const node = nodes.find(n => n.name === 'Bypass PG');
        
        console.log('--- Bypass PG Node Settings ---');
        console.log(JSON.stringify(node, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
})();
