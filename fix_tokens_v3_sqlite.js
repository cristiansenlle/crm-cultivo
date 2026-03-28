const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const WORKFLOW_ID = 'scpZdPe5Cp4MG98G';

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' }).then(async () => {

    const r = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT nodes FROM workflow_entity WHERE id='" + WORKFLOW_ID + "';\"");
    let nodes = JSON.parse(r.stdout);

    let changes = 0;
    nodes.forEach(n => {
        // 1. Language Models Max Tokens -> Explicitly limit to 200 outputs to prevent OpenRouter "afford" checks
        if (n.type && n.type.includes('lmChat')) {
            n.parameters = n.parameters || {};
            n.parameters.options = n.parameters.options || {};
            
            if (n.parameters.options.maxTokens !== 200) {
                console.log(`Node [${n.name}] -> Setting maxTokens to 200`);
                n.parameters.options.maxTokens = 200;
                changes++;
            }
        }
        
        // 2. Window Buffer Memory -> Limit history size to 2 to prevent massive Groq TPM limit hits
        if (n.type === '@n8n/n8n-nodes-langchain.memoryBufferWindow' || n.name.includes('Buffer Memory')) {
            n.parameters = n.parameters || {};
            if (n.parameters.k !== 2) {
                console.log(`Node [${n.name}] -> Setting window context size (k) to 2`);
                n.parameters.k = 2; // Keep only last 2 interactions
                changes++;
            }
        }
        
        // 3. Trim Database Queries to prevent large tool returns
        if (n.type === '@n8n/n8n-nodes-langchain.toolHttpRequest' && (n.name === 'consultar_lotes_groq' || n.name === 'consultar_lotes')) {
            if (n.parameters.url && !n.parameters.url.includes('select=')) {
                console.log(`Node [${n.name}] -> Adding ?select clause to url`);
                n.parameters.url = n.parameters.url.split('?')[0] + '?select=id,strain,stage,location,num_plants';
                changes++;
            }
        }
    });

    if (changes > 0) {
        const fs = require('fs');
        fs.writeFileSync('wf_tokens_fixed_v3.json', JSON.stringify(nodes));
        await ssh.putFile('wf_tokens_fixed_v3.json', '/tmp/wf_tokens_fixed_v3.json');
        
        const py = `
import sqlite3
with open('/tmp/wf_tokens_fixed_v3.json') as f: nodes = f.read()
conn = sqlite3.connect('/root/.n8n/database.sqlite')
conn.execute("UPDATE workflow_entity SET nodes=? WHERE id='${WORKFLOW_ID}'", [nodes])
conn.commit()
print('SQLite updated', conn.total_changes, 'row(s)')
conn.close()
`;
        await ssh.execCommand(`cat > /tmp/update_wf_tokens_v3.py << 'PYEOF'\n${py}\nPYEOF`);
        const pyRes = await ssh.execCommand('python3 /tmp/update_wf_tokens_v3.py');
        console.log(pyRes.stdout.trim());

        const keyRes = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT apiKey FROM user_api_keys LIMIT 1;\"");
        const apiKey = keyRes.stdout.trim();
        
        if (apiKey) {
            console.log('Flushing n8n runner memory via API...');
            await ssh.execCommand(`curl -s -X POST http://127.0.0.1:5678/api/v1/workflows/${WORKFLOW_ID}/deactivate -H "X-N8N-API-KEY: ${apiKey}"`);
            await new Promise(res => setTimeout(res, 1500));
            await ssh.execCommand(`curl -s -X POST http://127.0.0.1:5678/api/v1/workflows/${WORKFLOW_ID}/activate -H "X-N8N-API-KEY: ${apiKey}"`);
            console.log('Workflow memory flushed ✓');
        }
    } else {
        console.log('All token/memory limits already applied.');
    }

    ssh.dispose();
}).catch(console.error);
