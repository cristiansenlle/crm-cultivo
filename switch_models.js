const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' }).then(async () => {
    
    // Read live workflow nodes
    const r = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT nodes FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';\"");
    const nodes = JSON.parse(r.stdout);
    
    let changes = [];

    // 1. Change Gemini model from gemini-2.0-flash to gemini-1.5-flash
    const geminiIdx = nodes.findIndex(n => n.type === '@n8n/n8n-nodes-langchain.lmChatGoogleGemini');
    if (geminiIdx !== -1) {
        const oldModel = nodes[geminiIdx].parameters.modelName;
        nodes[geminiIdx].parameters.modelName = 'models/gemini-1.5-flash';
        changes.push(`Gemini: ${oldModel} → models/gemini-1.5-flash`);
    }

    // 2. Change Groq model from llama-3.3-70b-versatile to llama-3.1-8b-instant (more TPM)
    const groqIdx = nodes.findIndex(n => n.type === '@n8n/n8n-nodes-langchain.lmChatGroq');
    if (groqIdx !== -1) {
        const oldModel = nodes[groqIdx].parameters.model;
        nodes[groqIdx].parameters.model = 'llama-3.1-8b-instant';
        changes.push(`Groq: ${oldModel} → llama-3.1-8b-instant`);
    }

    console.log('Changes:', changes);

    // Save and upload
    const fs = require('fs');
    fs.writeFileSync('nodes_model_switch.json', JSON.stringify(nodes));
    await ssh.putFile('nodes_model_switch.json', '/tmp/nodes_model_switch.json');

    const py = `
import sqlite3
with open('/tmp/nodes_model_switch.json') as f: nodes = f.read()
conn = sqlite3.connect('/root/.n8n/database.sqlite')
conn.execute("UPDATE workflow_entity SET nodes=? WHERE id='scpZdPe5Cp4MG98G'", [nodes])
conn.commit()
print('Updated', conn.total_changes, 'row(s)')
conn.close()
`;
    await ssh.execCommand(`cat > /tmp/switch_models.py << 'PYEOF'\n${py}\nPYEOF`);
    const pyRes = await ssh.execCommand('python3 /tmp/switch_models.py');
    console.log('DB:', pyRes.stdout.trim());

    // Restart n8n
    await ssh.execCommand('pm2 restart n8n-service');
    console.log('n8n restarted ✓');

    ssh.dispose();
}).catch(e => console.error(e));
