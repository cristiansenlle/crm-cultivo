const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });

        const res = await ssh.execCommand("sqlite3 -json /root/.n8n/database.sqlite \"SELECT e.id, d.data FROM execution_entity e JOIN execution_data d ON e.id = d.executionId WHERE e.workflowId = 'scpZdPe5Cp4MG98G' ORDER BY e.startedAt DESC LIMIT 1;\"");
        
        fs.writeFileSync('v13_debug.json', res.stdout);
        ssh.dispose();
    } catch (err) {
        console.error('Debug failed:', err.message);
    }
})();
