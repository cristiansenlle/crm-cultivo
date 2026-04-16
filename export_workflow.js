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

        // Use a temporary js script on the server to extract JSON cleanly
        const serverScript = `
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('/root/.n8n/database.sqlite');
db.get("SELECT nodes, connections FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';", (err, row) => {
    if (err) { console.error(err); process.exit(1); }
    if (!row) { console.error('Workflow not found'); process.exit(1); }
    console.log(JSON.stringify({ nodes: JSON.parse(row.nodes), connections: JSON.parse(row.connections) }));
    db.close();
});
`;
        await ssh.execCommand("echo '" + serverScript.replace(/'/g, "'\\''") + "' > /tmp/export.js");
        const res = await ssh.execCommand('node /tmp/export.js');
        
        if (res.stderr) {
            console.error('Server Error:', res.stderr);
        } else {
            fs.writeFileSync('c:\\Users\\Cristian\\.gemini\\antigravity\\crm cannabis\\full-workflow.json', res.stdout);
            console.log('Full workflow downloaded to full-workflow.json');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
})();
