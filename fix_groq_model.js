const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' }).then(async () => {
    const r = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT nodes FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';\"");
    const nodes = JSON.parse(r.stdout);

    // Switch Groq back to llama-3.3-70b-versatile (supported by n8n's node, 12k TPM)
    // The system prompt is now only 984 chars so this will fit fine
    const groqIdx = nodes.findIndex(n => n.type === '@n8n/n8n-nodes-langchain.lmChatGroq');
    if (groqIdx !== -1) {
        const old = nodes[groqIdx].parameters.model;
        nodes[groqIdx].parameters.model = 'llama-3.3-70b-versatile';
        console.log(`Groq model: ${old} → llama-3.3-70b-versatile`);
    }

    const fs = require('fs');
    fs.writeFileSync('nodes_groq_fixed.json', JSON.stringify(nodes));
    await ssh.putFile('nodes_groq_fixed.json', '/tmp/nodes_groq_fixed.json');

    const py = `
import sqlite3
with open('/tmp/nodes_groq_fixed.json') as f: nodes = f.read()
conn = sqlite3.connect('/root/.n8n/database.sqlite')
conn.execute("UPDATE workflow_entity SET nodes=? WHERE id='scpZdPe5Cp4MG98G'", [nodes])
conn.commit()
print('Updated', conn.total_changes, 'row(s)')
conn.close()
`;
    await ssh.execCommand(`cat > /tmp/fix_groq_model.py << 'PYEOF'\n${py}\nPYEOF`);
    const pyRes = await ssh.execCommand('python3 /tmp/fix_groq_model.py');
    console.log(pyRes.stdout.trim());

    await ssh.execCommand('pm2 restart n8n-service');
    console.log('n8n restarted ✓');

    ssh.dispose();
}).catch(e => console.error(e));
