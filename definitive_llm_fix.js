const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

// OpenRouter has truly FREE models that require NO credits:
// meta-llama/llama-3.3-70b-instruct:free  — 130k context, no cost
// google/gemini-2.0-flash-exp:free        — also free
const FREE_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' }).then(async () => {
    const r = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT nodes FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';\"");
    const nodes = JSON.parse(r.stdout);

    // 1. Find the Gemini node and replace it entirely with OpenRouter (free model)
    // Keep same node ID and position so connections stay intact
    const geminiIdx = nodes.findIndex(n => n.name === 'Google Gemini 2.0 Flash');
    if (geminiIdx === -1) {
        console.error('Gemini node not found, check node names');
        ssh.dispose(); return;
    }

    const originalGemini = nodes[geminiIdx];
    console.log('Replacing node:', originalGemini.name, '| position:', originalGemini.position);

    // OpenRouter credential already exists (CN5018CsgxQLJts8)
    nodes[geminiIdx] = {
        parameters: {
            model: FREE_MODEL,
            options: {}
        },
        id: originalGemini.id,      // keep same UUID so connections still work
        name: 'OpenRouter (Free LLaMA 70B)',
        type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
        typeVersion: 1,
        position: originalGemini.position,
        credentials: {
            openRouterApi: {
                id: 'CN5018CsgxQLJts8',
                name: 'OpenRouter account'
            }
        }
    };
    console.log('Replaced with:', nodes[geminiIdx].name, '| model:', FREE_MODEL);

    // 2. Also update the connections map if the old name is a key
    const r2 = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT connections FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';\"");
    let connections = JSON.parse(r2.stdout);
    const oldName = 'Google Gemini 2.0 Flash';
    const newName = 'OpenRouter (Free LLaMA 70B)';
    if (connections[oldName]) {
        connections[newName] = connections[oldName];
        delete connections[oldName];
        console.log('Connections renamed:', oldName, '→', newName);
    }

    // 3. Verify Groq is still correctly set
    const groqNode = nodes.find(n => n.type === '@n8n/n8n-nodes-langchain.lmChatGroq');
    console.log('Groq model:', groqNode?.parameters?.model);

    // 4. Save and deploy
    const fs = require('fs');
    fs.writeFileSync('nodes_definitive_fix.json', JSON.stringify(nodes));
    fs.writeFileSync('conns_definitive_fix.json', JSON.stringify(connections));
    await ssh.putFile('nodes_definitive_fix.json', '/tmp/nodes_def.json');
    await ssh.putFile('conns_definitive_fix.json', '/tmp/conns_def.json');

    const py = `
import sqlite3
with open('/tmp/nodes_def.json') as f: nodes = f.read()
with open('/tmp/conns_def.json') as f: conns = f.read()
conn = sqlite3.connect('/root/.n8n/database.sqlite')
conn.execute("UPDATE workflow_entity SET nodes=?, connections=? WHERE id='scpZdPe5Cp4MG98G'", [nodes, conns])
conn.commit()
print('Updated', conn.total_changes, 'row(s)')
conn.close()
`;
    await ssh.execCommand(`cat > /tmp/def_fix.py << 'PYEOF'\n${py}\nPYEOF`);
    const pyRes = await ssh.execCommand('python3 /tmp/def_fix.py');
    console.log('DB:', pyRes.stdout.trim());

    await ssh.execCommand('pm2 restart n8n-service');
    console.log('n8n restarted ✓');

    ssh.dispose();
}).catch(e => console.error(e));
