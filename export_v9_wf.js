const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();
const WORKFLOW_ID = 'scpZdPe5Cp4MG98G';

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' }).then(async () => {
    console.log('Fetching V8 workflow from VPS SQLite to overwrite with exact N8N Supported Variables...');
    
    const r = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT * FROM workflow_entity WHERE id='" + WORKFLOW_ID + "';\" -json");
    try {
        const rows = JSON.parse(r.stdout);
        const wf = rows[0];
        
        let parsedNodes = JSON.parse(wf.nodes);
        
        parsedNodes.forEach(n => {
            if (n.type && n.type.includes('memoryBufferWindow')) {
                n.parameters = n.parameters || {};
                n.parameters.k = 0;
            }
            if (n.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi') {
                n.parameters.options = n.parameters.options || {};
                n.parameters.options.maxTokens = 500;
            }
            if (n.type === '@n8n/n8n-nodes-langchain.lmChatGroq') {
                // n8n UI Dropdown strictly requires this exact string!
                n.parameters.model = 'llama-3.1-8b-instant';
                n.parameters.options = n.parameters.options || {};
                n.parameters.options.maxTokens = 500;
            }
        });

        const exportFormat = {
            name: wf.name + " (Llama 8B V9 K0)",
            nodes: parsedNodes,
            connections: JSON.parse(wf.connections),
            active: wf.active === 1,
            settings: wf.settings ? JSON.parse(wf.settings) : {},
            meta: wf.meta ? JSON.parse(wf.meta) : {},
            tags: []
        };
        
        const fileOut = "n8n-crm-cannabis-FINAL-V9.json";
        fs.writeFileSync(fileOut, JSON.stringify(exportFormat, null, 2));
        console.log("✅ Workflow exported successfully to " + fileOut);
        
    } catch(e) {
        console.error('Failed formatting JSON:', e.message);
    }
    ssh.dispose();
}).catch(console.error);
