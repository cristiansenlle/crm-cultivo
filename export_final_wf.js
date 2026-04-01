const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();
const WORKFLOW_ID = 'scpZdPe5Cp4MG98G';

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' }).then(async () => {
    console.log('Fetching live workflow from VPS SQLite...');
    
    // N8N stores workflows with full metadata. We extract the row.
    const r = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT * FROM workflow_entity WHERE id='" + WORKFLOW_ID + "';\" -json");
    try {
        const rows = JSON.parse(r.stdout);
        const wf = rows[0];
        
        // Build valid N8N import JSON format
        const exportFormat = {
            name: wf.name + " (Patched Tokens Final)",
            nodes: JSON.parse(wf.nodes),
            connections: JSON.parse(wf.connections),
            active: wf.active === 1,
            settings: wf.settings ? JSON.parse(wf.settings) : {},
            meta: wf.meta ? JSON.parse(wf.meta) : {},
            tags: []
        };
        
        const d = new Date();
        const strDate = d.toISOString().split('T')[0];
        const fileOut = "n8n-crm-cannabis-TOKENS-V5-" + strDate + ".json";
        
        fs.writeFileSync(fileOut, JSON.stringify(exportFormat, null, 2));
        console.log("✅ Workflow exported successfully to " + fileOut);
        console.log("Nodes count: " + exportFormat.nodes.length);
        
    } catch(e) {
        console.error('Failed formatting JSON:', e.message);
    }
    ssh.dispose();
}).catch(console.error);
