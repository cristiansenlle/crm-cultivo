const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

ssh.connect({
    host: '109.199.99.126',
    username: 'root',
    password: 'HIDDEN_SECRET_BY_AI'
}).then(async () => {
    // Read the CURRENT live nodes (with the middleware prompt patch)
    const r = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT nodes FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';\"");
    
    const nodes = JSON.parse(r.stdout);
    
    // Remove the MIDDLEWARE block from system prompts (everything after the MIDDLEWARE separator)
    const MIDDLEWARE_MARKER = '\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ REGLAS DE APLICACIÓN DE INSUMOS (MIDDLEWARE AGRONÓMICO)';
    
    let revertCount = 0;
    nodes.forEach((n, i) => {
        if (n.type === '@n8n/n8n-nodes-langchain.agent') {
            const currentPrompt = n.parameters?.options?.systemMessage || '';
            if (currentPrompt.includes('MIDDLEWARE AGRONÓMICO')) {
                // Strip the middleware block
                const cutIdx = currentPrompt.indexOf(MIDDLEWARE_MARKER);
                if (cutIdx > 0) {
                    n.parameters.options.systemMessage = currentPrompt.substring(0, cutIdx);
                    revertCount++;
                    console.log(`Reverted prompt for: ${n.name} (${currentPrompt.length} → ${n.parameters.options.systemMessage.length} chars)`);
                }
            }
        }
    });
    
    if (revertCount === 0) {
        console.log('Nothing to revert.');
        ssh.dispose();
        return;
    }
    
    // Save and deploy
    const nodesJson = JSON.stringify(nodes);
    fs.writeFileSync('nodes_reverted_clean.json', nodesJson);
    await ssh.putFile('nodes_reverted_clean.json', '/tmp/nodes_reverted.json');
    
    // Python update
    const pyScript = `
import sqlite3
with open('/tmp/nodes_reverted.json','r') as f:
    nodes = f.read()
conn = sqlite3.connect('/root/.n8n/database.sqlite')
conn.execute("UPDATE workflow_entity SET nodes=? WHERE id='scpZdPe5Cp4MG98G'", [nodes])
conn.commit()
print('Updated', conn.total_changes, 'row(s)')
conn.close()
`;
    await ssh.execCommand(`cat > /tmp/revert_prompt.py << 'PYEOF'\n${pyScript}\nPYEOF`);
    const pyResult = await ssh.execCommand('python3 /tmp/revert_prompt.py');
    console.log('Python result:', pyResult.stdout, pyResult.stderr);
    
    // Restart n8n
    const restart = await ssh.execCommand('pm2 restart n8n-service');
    console.log('Restart:', restart.stdout?.substring(0, 100));
    
    ssh.dispose();
}).catch(e => console.error(e));
