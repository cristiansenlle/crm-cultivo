const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const WORKFLOW_ID = 'scpZdPe5Cp4MG98G';

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' }).then(async () => {

    const r = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT nodes FROM workflow_entity WHERE id='" + WORKFLOW_ID + "';\"");
    let nodes = JSON.parse(r.stdout);

    nodes.forEach(n => {
        // 1. Completely obliterate conversational overlap (k=0) to keep TPM ultra low
        if (n.type && n.type.includes('memoryBufferWindow')) {
            n.parameters = n.parameters || {};
            n.parameters.k = 0; // The agent will still remember internal tool steps scratching, but no prior convos.
            console.log(`Node [${n.name}] Memory clamped to K=0`);
        }
        
        // 2. OpenRouter Timeout Extensions (if applicable)
        if (n.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi') {
            n.parameters.options = n.parameters.options || {};
            n.parameters.options.timeout = 45000;
            n.parameters.options.maxRetries = 3;
            console.log(`Node [${n.name}] OpenRouter timeout extended to 45s + 3 Retries`);
        }
        
        // 3. Fallback Model to Gemma to spread out limits and try luck with its TPU allocation
        if (n.type === '@n8n/n8n-nodes-langchain.lmChatGroq') {
            n.parameters.model = 'gemma2-9b-it';
            console.log(`Node [${n.name}] Groq model switched to gemma2-9b-it`);
        }
    });

    const fs = require('fs');
    fs.writeFileSync('wf_tokens_fixed_v8.json', JSON.stringify(nodes));
    await ssh.putFile('wf_tokens_fixed_v8.json', '/tmp/wf_tokens_fixed_v8.json');
    
    const py = `
import sqlite3, json
with open('/tmp/wf_tokens_fixed_v8.json') as f: nodes = f.read()
conn = sqlite3.connect('/root/.n8n/database.sqlite')
conn.execute("UPDATE workflow_entity SET nodes=? WHERE id='${WORKFLOW_ID}'", [nodes])
conn.commit()
print('SQLite updated', conn.total_changes, 'row(s)')
conn.close()
`;
    await ssh.execCommand(`cat > /tmp/update_wf_tokens_v8.py << 'PYEOF'\n${py}\nPYEOF`);
    const pyRes = await ssh.execCommand('python3 /tmp/update_wf_tokens_v8.py');
    console.log(pyRes.stdout.trim());

    // Flush cache
    const keyRes = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT apiKey FROM user_api_keys LIMIT 1;\"");
    const apiKey = keyRes.stdout.trim();
    if (apiKey) {
        console.log('Flushing n8n workflow cache...');
        await ssh.execCommand(`curl -s -X POST http://127.0.0.1:5678/api/v1/workflows/${WORKFLOW_ID}/deactivate -H "X-N8N-API-KEY: ${apiKey}"`);
        await new Promise(res => setTimeout(res, 1500));
        await ssh.execCommand(`curl -s -X POST http://127.0.0.1:5678/api/v1/workflows/${WORKFLOW_ID}/activate -H "X-N8N-API-KEY: ${apiKey}"`);
        console.log('Workflow reactivated ✓');
    }

    ssh.dispose();
}).catch(console.error);
