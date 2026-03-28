const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
        
        console.log('--- Fetching Full Workflow JSON (scp) ---');
        const res = await ssh.execCommand("sqlite3 -json /root/.n8n/database.sqlite \"SELECT nodes, connections FROM workflow_entity WHERE id = 'scpZdPe5Cp4MG98G';\"");
        const data = JSON.parse(res.stdout || '[]');
        
        if (data.length > 0) {
            fs.writeFileSync('scp_full_export.json', JSON.stringify(data[0], null, 2));
            console.log('Exported to scp_full_export.json');
            
            const nodes = JSON.parse(data[0].nodes);
            const offending = nodes.filter(n => n.type.includes('executeCommand'));
            console.log('Nodes matching executeCommand:', offending.map(n => ({ name: n.name, type: n.type })));
        } else {
            console.log('Workflow scp not found!');
        }

        ssh.dispose();
    } catch (err) {
        console.error('Fetch failed:', err.message);
    }
})();
