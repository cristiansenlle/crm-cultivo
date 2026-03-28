const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function downloadWf() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log("Downloading CRM Cannabis wf...");
    
    const extractor = `
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const db = new sqlite3.Database('/root/.n8n/database.sqlite');

db.get("SELECT nodes, connections FROM workflow_entity WHERE id = 'scpZdPe5Cp4MG98G'", (err, row) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    if (row) {
        const wf = { nodes: JSON.parse(row.nodes), connections: JSON.parse(row.connections) };
        fs.writeFileSync('/tmp/active_wf_extracted.json', JSON.stringify(wf, null, 2));
        console.log("DONE");
    } else {
        console.log("NOT FOUND");
    }
});
    `;

    await ssh.execCommand(`cat > /tmp/extractor.js << 'EOF'\n${extractor}\nEOF`);
    await ssh.execCommand('node /tmp/extractor.js', { cwd: '/root' });
    
    await ssh.getFile('active_wf_extracted.json', '/tmp/active_wf_extracted.json');
    console.log("Downloaded to active_wf_extracted.json");

    ssh.dispose();
}

downloadWf().catch(console.error);
