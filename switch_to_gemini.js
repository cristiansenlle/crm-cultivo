const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const { randomUUID } = require('crypto');
const ssh = new NodeSSH();

const GEMINI_API_KEY = 'AIzaSyCrglBECK5uuTxh-Mlw7_z76AwrnUc4lac';
const GEMINI_CRED_ID = 'gGemFlash2026001';  // short unique ID

ssh.connect({
    host: '109.199.99.126',
    username: 'root',
    password: 'HIDDEN_SECRET_BY_AI'
}).then(async () => {

    // ─── 1. Check if Gemini credential already exists ───
    const existing = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "SELECT id FROM credentials_entity WHERE type='googleGeminiApi';"`);
    let geminiCredId = existing.stdout.trim();
    
    if (geminiCredId) {
        console.log('Gemini credential already exists, ID:', geminiCredId);
    } else {
        // Create Gemini credential in n8n's encrypted credentials_entity table
        // n8n encrypts credential data — we use Python to insert it in cleartext (n8n will re-encrypt on restart)
        const credData = JSON.stringify({ apiKey: GEMINI_API_KEY });
        
        const pyScript = `
import sqlite3, json
from datetime import datetime

conn = sqlite3.connect('/root/.n8n/database.sqlite')
cred_id = '${GEMINI_CRED_ID}'
name = 'Google Gemini (Free)'
cred_type = 'googleGeminiApi'
data = json.dumps({"apiKey": "${GEMINI_API_KEY}"})
now = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S.000')

conn.execute("""
    INSERT OR REPLACE INTO credentials_entity (id, name, data, type, createdAt, updatedAt, isManaged, isGlobal, isResolvable, resolvableAllowFallback)
    VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0)
""", [cred_id, name, data, cred_type, now, now])
conn.commit()
print('Credential inserted, ID:', cred_id)
conn.close()
`;
        await ssh.execCommand(`cat > /tmp/insert_gemini_cred.py << 'PYEOF'\n${pyScript}\nPYEOF`);
        const pyRes = await ssh.execCommand('python3 /tmp/insert_gemini_cred.py');
        console.log('Credential result:', pyRes.stdout, pyRes.stderr);
        geminiCredId = GEMINI_CRED_ID;
    }

    // ─── 2. Read live workflow nodes ───
    const r = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT nodes FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';\"");
    const nodes = JSON.parse(r.stdout);

    // ─── 3. Replace OpenRouter node with Gemini Flash node ───
    const openrouterIdx = nodes.findIndex(n => n.name === 'OpenRouter (GPT-OSS 120B)');
    if (openrouterIdx === -1) {
        console.error('OpenRouter node not found!');
        ssh.dispose(); return;
    }

    const originalNode = nodes[openrouterIdx];
    // Replace with Gemini 2.0 Flash node keeping same position and connections
    nodes[openrouterIdx] = {
        parameters: {
            modelName: 'models/gemini-2.0-flash',
            options: {}
        },
        id: originalNode.id,   // keep same ID so connections still work
        name: 'Google Gemini 2.0 Flash',
        type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
        typeVersion: 1,
        position: originalNode.position,
        credentials: {
            googleGeminiApi: {
                id: geminiCredId,
                name: 'Google Gemini (Free)'
            }
        }
    };

    console.log(`Patched node at index ${openrouterIdx}: OpenRouter → Gemini 2.0 Flash`);
    console.log('New node name:', nodes[openrouterIdx].name);

    // ─── 4. Also update connections that reference the old node name ───
    const r2 = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT connections FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';\"");
    let connections = JSON.parse(r2.stdout);

    // Rename connection key from old name to new name
    const oldName = 'OpenRouter (GPT-OSS 120B)';
    const newName = 'Google Gemini 2.0 Flash';
    if (connections[oldName]) {
        connections[newName] = connections[oldName];
        delete connections[oldName];
        console.log('Connections key renamed:', oldName, '→', newName);
    }

    // ─── 5. Save locally and upload ───
    const nodesJson = JSON.stringify(nodes);
    const connsJson = JSON.stringify(connections);
    fs.writeFileSync('gemini_patched_nodes.json', nodesJson);
    fs.writeFileSync('gemini_patched_connections.json', connsJson);
    await ssh.putFile('gemini_patched_nodes.json', '/tmp/gemini_nodes.json');
    await ssh.putFile('gemini_patched_connections.json', '/tmp/gemini_conns.json');

    // ─── 6. Update SQLite ───
    const pyUpdate = `
import sqlite3

with open('/tmp/gemini_nodes.json','r') as f:
    nodes = f.read()
with open('/tmp/gemini_conns.json','r') as f:
    conns = f.read()

conn = sqlite3.connect('/root/.n8n/database.sqlite')
conn.execute("UPDATE workflow_entity SET nodes=?, connections=? WHERE id='scpZdPe5Cp4MG98G'", [nodes, conns])
conn.commit()
print('Updated', conn.total_changes, 'row(s)')
conn.close()
`;
    await ssh.execCommand(`cat > /tmp/update_gemini_wf.py << 'PYEOF'\n${pyUpdate}\nPYEOF`);
    const updateRes = await ssh.execCommand('python3 /tmp/update_gemini_wf.py');
    console.log('Workflow update:', updateRes.stdout, updateRes.stderr);

    // ─── 7. Restart n8n ───
    const restart = await ssh.execCommand('pm2 restart n8n-service');
    console.log('n8n restarted:', restart.stdout?.substring(0, 100));

    ssh.dispose();
}).catch(e => console.error(e));
