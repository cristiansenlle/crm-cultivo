const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
        
        console.log('--- DIAGNOSTIC SMOKE TEST ---');
        
        // Overwrite the Format WA Response with a simple hardcoded return
        const res = await ssh.execCommand("sqlite3 -json /root/.n8n/database.sqlite \"SELECT nodes FROM workflow_entity WHERE id = 'scpZdPe5Cp4MG98G';\"");
        const data = JSON.parse(res.stdout || '[]');
        let nodes = JSON.parse(data[0].nodes);
        
        nodes = nodes.map(n => {
            if (n.name === 'Format WA Response') {
                n.parameters = {
                    jsCode: "return [{ json: { response: 'SUCCESS SANITIZED' } }];"
                };
            }
            return n;
        });

        const nodesJson = JSON.stringify(nodes);
        await ssh.execCommand("cat <<'EOF' > /tmp/nodes_smoke.json\n" + nodesJson + "\nEOF");
        await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"UPDATE workflow_entity SET nodes = (SELECT readfile('/tmp/nodes_smoke.json')), active = 1 WHERE id = 'scpZdPe5Cp4MG98G';\"");
        await ssh.execCommand('pm2 restart n8n-service');

        console.log('Smoke test applied. Waiting...');
        ssh.dispose();
    } catch (err) {
        console.error(err);
    }
})();
