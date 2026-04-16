const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const WORKFLOW_ID = 'scpZdPe5Cp4MG98G';

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' }).then(async () => {

    const keyRes = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT apiKey FROM user_api_keys LIMIT 1;\"");
    const apiKey = keyRes.stdout.trim();
    if (!apiKey) { console.error('No API Key'); ssh.dispose(); return; }

    const wfRes = await ssh.execCommand(`curl -s http://127.0.0.1:5678/api/v1/workflows/${WORKFLOW_ID} -H "X-N8N-API-KEY: ${apiKey}"`);
    const wf = JSON.parse(wfRes.stdout);
    
    let changes = 0;
    (wf.nodes || []).forEach(n => {
        // 1. Check and fix Language Models Max Tokens
        if (n.type && n.type.includes('lmChat')) {
            // Force Max Tokens parameter to 1024 to stop massive requests
            n.parameters.options = n.parameters.options || {};
            if (!n.parameters.options.maxTokens) {
                console.log(`Setting maxTokens=1024 for: ${n.name}`);
                n.parameters.options.maxTokens = 1024;
                changes++;
            }
        }
        
        // 2. Check and fix Window Buffer Memory
        if (n.type === '@n8n/n8n-nodes-langchain.memoryBufferWindow') {
            console.log(`Setting Memory limits for: ${n.name}`);
            n.parameters.k = 4; // Only keep the last 4 interactions
            changes++;
        }
    });

    if (changes > 0) {
        const fs = require('fs');
        fs.writeFileSync('wf_tokens_fix.json', JSON.stringify(wf));
        await ssh.putFile('wf_tokens_fix.json', '/tmp/wf_tokens_fix.json');
        
        const putRes = await ssh.execCommand(`curl -s -X PUT http://127.0.0.1:5678/api/v1/workflows/${WORKFLOW_ID} -H "X-N8N-API-KEY: ${apiKey}" -H "Content-Type: application/json" -d @/tmp/wf_tokens_fix.json -w " HTTP:%{http_code}"`);
        console.log('PUT result:', putRes.stdout.slice(-15));
        
        // Reload workflow in n8n's memory
        await ssh.execCommand(`curl -s -X POST http://127.0.0.1:5678/api/v1/workflows/${WORKFLOW_ID}/deactivate -H "X-N8N-API-KEY: ${apiKey}"`);
        await new Promise(r => setTimeout(r, 1500));
        await ssh.execCommand(`curl -s -X POST http://127.0.0.1:5678/api/v1/workflows/${WORKFLOW_ID}/activate -H "X-N8N-API-KEY: ${apiKey}"`);
        console.log('Workflow deactivated -> reactivated to flush memory');
    } else {
        console.log('No token/memory changes were needed.');
    }

    ssh.dispose();
}).catch(console.error);
