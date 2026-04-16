const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const WORKFLOW_ID = 'scpZdPe5Cp4MG98G';

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' }).then(async () => {
    console.log('[1/4] Stopping N8N to unlock SQLite...');
    await ssh.execCommand('pm2 stop n8n-service');

    console.log('[2/4] Fetching SQLite Data...');
    const r = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT nodes FROM workflow_entity WHERE id='" + WORKFLOW_ID + "';\"");
    let nodes = JSON.parse(r.stdout);

    const microPrompt = `Eres AgronomyBot 360. Manejas lotes, salas y eventos ejecutando SIEMPRE las herramientas. Reglas: NUNCA asumas IDs, usa los tools de consulta. Para múltiples registros, ejecuta silenciosamente 1 por 1. Al terminar, resume brevemente en español.`;

    nodes.forEach(n => {
        // Zero memory
        if (n.type && n.type.includes('memoryBufferWindow')) {
            n.parameters = n.parameters || {};
            n.parameters.k = 0;
        }
        // Force Llama 3.1 8B (UI Compatible) and rewrite prompt to save 4000 tokens
        if (n.type === '@n8n/n8n-nodes-langchain.lmChatGroq') {
            n.parameters.model = 'llama-3.1-8b-instant';
            n.parameters.options = n.parameters.options || {};
            n.parameters.options.maxTokens = 500;
        }
        if (n.type && n.type.includes('Agent')) {
            if (n.parameters && n.parameters.text) {
                n.parameters.text = microPrompt;
            }
        }
        // Clamp OpenRouter strictly to 500 tokens to bypass "Afford 931" error forever
        if (n.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi') {
            n.parameters.options = n.parameters.options || {};
            n.parameters.options.maxTokens = 500;
            n.parameters.options.timeout = 45000;
        }
    });

    const fs = require('fs');
    fs.writeFileSync('wf_hard_patch.json', JSON.stringify(nodes));
    await ssh.putFile('wf_hard_patch.json', '/tmp/wf_hard_patch.json');
    
    console.log('[3/4] Updating SQLite Headlessly...');
    const py = `
import sqlite3, json
with open('/tmp/wf_hard_patch.json') as f: nodes = f.read()
conn = sqlite3.connect('/root/.n8n/database.sqlite')
conn.execute("UPDATE workflow_entity SET nodes=? WHERE id='${WORKFLOW_ID}'", [nodes])
conn.commit()
print('SQLite updated', conn.total_changes, 'row(s)')
conn.close()
`;
    await ssh.execCommand(`cat > /tmp/do_hard_patch.py << 'PYEOF'\n${py}\nPYEOF`);
    const pyRes = await ssh.execCommand('python3 /tmp/do_hard_patch.py');
    console.log(pyRes.stdout.trim());

    console.log('[4/4] Restarting N8N...');
    await ssh.execCommand('pm2 start n8n-service');
    console.log('✅ Final Database & Engine override completed!');

    ssh.dispose();
}).catch(console.error);
