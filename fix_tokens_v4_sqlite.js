const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const WORKFLOW_ID = 'scpZdPe5Cp4MG98G';

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' }).then(async () => {

    const r = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT nodes FROM workflow_entity WHERE id='" + WORKFLOW_ID + "';\"");
    let nodes = JSON.parse(r.stdout);

    let changes = 0;
    nodes.forEach(n => {
        // Increase Max Tokens to 600 so it has room to generate tool calls AND the final response
        if (n.type && n.type.includes('lmChat')) {
            n.parameters = n.parameters || {};
            n.parameters.options = n.parameters.options || {};
            
            if (n.parameters.options.maxTokens === 200 || !n.parameters.options.maxTokens) {
                console.log(`Node [${n.name}] -> Setting maxTokens to 600`);
                n.parameters.options.maxTokens = 600;
                changes++;
            }
        }
    });

    if (changes > 0) {
        const fs = require('fs');
        fs.writeFileSync('wf_tokens_fixed_v4.json', JSON.stringify(nodes));
        await ssh.putFile('wf_tokens_fixed_v4.json', '/tmp/wf_tokens_fixed_v4.json');
        
        const py = `
import sqlite3
with open('/tmp/wf_tokens_fixed_v4.json') as f: nodes = f.read()
conn = sqlite3.connect('/root/.n8n/database.sqlite')
conn.execute("UPDATE workflow_entity SET nodes=? WHERE id='${WORKFLOW_ID}'", [nodes])
conn.commit()
print('SQLite updated', conn.total_changes, 'row(s)')
conn.close()
`;
        await ssh.execCommand(`cat > /tmp/update_wf_tokens_v4.py << 'PYEOF'\n${py}\nPYEOF`);
        const pyRes = await ssh.execCommand('python3 /tmp/update_wf_tokens_v4.py');
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
        console.log('Token limit already applied.');
    }

    ssh.dispose();
}).catch(console.error);
