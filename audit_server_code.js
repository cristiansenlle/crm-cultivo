const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
        
        const res = await ssh.execCommand("sqlite3 -json /root/.n8n/database.sqlite \"SELECT nodes FROM workflow_entity WHERE id = 'scpZdPe5Cp4MG98G';\"");
        
        if (!res.stdout) {
             console.log("No workflow found.");
             ssh.dispose();
             return;
        }

        const data = JSON.parse(res.stdout);
        const nodes = JSON.parse(data[0].nodes);
        const formatter = nodes.find(n => n.name === 'Format WA Response');
        
        console.log("=== SERVER JS CODE ===");
        console.log(formatter.parameters.jsCode);
        console.log("======================");

        ssh.dispose();
    } catch (err) {
        console.error('Audit failed:', err.message);
    }
})();
