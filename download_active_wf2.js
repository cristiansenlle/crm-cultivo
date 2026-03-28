const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function downloadWf() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log("Downloading via Python sqlite3...");
    const pyScript = `
import sqlite3
import json

try:
    conn = sqlite3.connect('/root/.n8n/database.sqlite')
    c = conn.cursor()
    c.execute("SELECT nodes, connections FROM workflow_entity WHERE id = 'scpZdPe5Cp4MG98G'")
    row = c.fetchone()
    if row:
        wf = {"nodes": json.loads(row[0]), "connections": json.loads(row[1])}
        with open('/tmp/active_wf_extracted.json', 'w') as f:
            json.dump(wf, f, indent=2)
        print("DONE")
    else:
        print("NOT FOUND")
except Exception as e:
    print(f"Error: {e}")
`;

    await ssh.execCommand(`cat > /tmp/extractor.py << 'EOF'\n${pyScript}\nEOF`);
    const runRes = await ssh.execCommand('python3 /tmp/extractor.py', { cwd: '/root' });
    console.log("Python STDOUT:", runRes.stdout);
    
    try {
        await ssh.getFile('active_wf_extracted.json', '/tmp/active_wf_extracted.json');
        console.log("Downloaded to active_wf_extracted.json");
    } catch (e) {
        console.error("Download failed", e.message);
    }

    ssh.dispose();
}

downloadWf().catch(console.error);
