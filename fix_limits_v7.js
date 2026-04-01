const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const WORKFLOW_ID = 'scpZdPe5Cp4MG98G';

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' }).then(async () => {

    const r = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT nodes FROM workflow_entity WHERE id='" + WORKFLOW_ID + "';\"");
    let nodes = JSON.parse(r.stdout);

    nodes.forEach(n => {
        // Fix Groq decommissioned model -> upgrade to Llama 3.1 8B Instant
        if (n.type === '@n8n/n8n-nodes-langchain.lmChatGroq') {
            const oldModel = n.parameters.model;
            n.parameters.model = 'llama-3.1-8b-instant';
            console.log(`Node [${n.name}] Model changed from ${oldModel} to ${n.parameters.model}`);
        }
    });

    const fs = require('fs');
    fs.writeFileSync('wf_tokens_fixed_v7.json', JSON.stringify(nodes));
    await ssh.putFile('wf_tokens_fixed_v7.json', '/tmp/wf_tokens_fixed_v7.json');
    
    const py = `
import sqlite3, json
with open('/tmp/wf_tokens_fixed_v7.json') as f: nodes = f.read()
conn = sqlite3.connect('/root/.n8n/database.sqlite')
conn.execute("UPDATE workflow_entity SET nodes=? WHERE id='${WORKFLOW_ID}'", [nodes])
conn.commit()
print('SQLite updated', conn.total_changes, 'row(s)')
conn.close()
`;
    await ssh.execCommand(`cat > /tmp/update_wf_tokens_v7.py << 'PYEOF'\n${py}\nPYEOF`);
    const pyRes = await ssh.execCommand('python3 /tmp/update_wf_tokens_v7.py');
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
