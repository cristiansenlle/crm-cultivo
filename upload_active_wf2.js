const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function uploadWf() {
    try {
        const localJsonStr = fs.readFileSync('active_wf_patched.json', 'utf8');
        const wf = JSON.parse(localJsonStr);

        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log("Uploading patched active_wf_patched.json...");
        
        // Push the file
        await ssh.execCommand(`cat > /tmp/active_wf_patched.json << 'EOF'\n${localJsonStr}\nEOF`);

        // Create script to update only the nodes in workflow_entity
        const updater = `
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('/tmp/active_wf_patched.json', 'utf8'));
const nodesStr = JSON.stringify(wf.nodes);

const db = new sqlite3.Database('/root/.n8n/database.sqlite', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('DB Open Error:', err);
        process.exit(1);
    }
});

db.serialize(() => {
    db.run("UPDATE workflow_entity SET nodes = ?, versionCounter = versionCounter + 1 WHERE id = 'scpZdPe5Cp4MG98G'", [nodesStr], function(err) {
        if (err) console.error('Update Error:', err);
        else console.log('UPDATE SUCCESS. Rows affected:', this.changes);
    });
    
    // Also update the published version if it exists
    db.run("UPDATE workflow_published_version SET nodes = ? WHERE workflowId = 'scpZdPe5Cp4MG98G'", [nodesStr], function(err) {
        if (err) console.error('Update Published Error:', err);
        else console.log('UPDATE PUBLISHED SUCCESS. Rows affected:', this.changes);
    });
});

db.close(() => console.log('Database connection closed.'));
        `;

        await ssh.execCommand(`cat > /tmp/updater.js << 'EOF'\n${updater}\nEOF`);
        
        console.log("Executing Python wrapper for JS fallback, actually let's just use Python directly because JS failed last time due to 'sqlite3' missing globally!");
        
        const pythonUpdater = `
import sqlite3
import json

try:
    with open('/tmp/active_wf_patched.json', 'r') as f:
        wf = json.load(f)
    
    nodes_str = json.dumps(wf['nodes'])
    
    conn = sqlite3.connect('/root/.n8n/database.sqlite')
    c = conn.cursor()
    
    c.execute("UPDATE workflow_entity SET nodes = ?, versionCounter = versionCounter + 1 WHERE id = 'scpZdPe5Cp4MG98G'", (nodes_str,))
    print(f"UPDATE SUCCESS. Rows affected: {c.rowcount}")
    
    c.execute("UPDATE workflow_published_version SET nodes = ? WHERE workflowId = 'scpZdPe5Cp4MG98G'", (nodes_str,))
    print(f"UPDATE PUBLISHED SUCCESS. Rows affected: {c.rowcount}")
    
    conn.commit()
    conn.close()
    
except Exception as e:
    print(f"Error: {e}")
`;

        await ssh.execCommand(`cat > /tmp/updater.py << 'EOF'\n${pythonUpdater}\nEOF`);
        const runRes = await ssh.execCommand('python3 /tmp/updater.py', { cwd: '/root' });
        
        console.log("Python STDOUT:", runRes.stdout);
        console.log("Python STDERR:", runRes.stderr);

        // Restart n8n container
        console.log("\nRestarting n8n-service via PM2...");
        const pm2Res = await ssh.execCommand('pm2 restart n8n-service', { cwd: '/root' });
        console.log("PM2 STDOUT:", pm2Res.stdout);

        ssh.dispose();
    } catch (e) {
        console.error("Upload error:", e.message);
    }
}

uploadWf().catch(console.error);
