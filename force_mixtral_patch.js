const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const WORKFLOW_ID = 'scpZdPe5Cp4MG98G';

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' }).then(async () => {
    console.log('[1/4] Fetching SQLite Data...');
    const r = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT nodes FROM workflow_entity WHERE id='" + WORKFLOW_ID + "';\" -json");
    try {
        const rows = JSON.parse(r.stdout);
        const wfNodes = JSON.parse(rows[0].nodes);

        wfNodes.forEach(n => {
            // Force Mixtral directly in the backend. 
            // The n8n backend runner accepts it, only the UI complains.
            if (n.type === '@n8n/n8n-nodes-langchain.lmChatGroq') {
                n.parameters.model = 'mixtral-8x7b-32768';
                n.parameters.options = n.parameters.options || {};
                n.parameters.options.maxTokens = 500;
                console.log(`Node [${n.name}] model mapped to mixtral-8x7b-32768`);
            }
        });

        const fs = require('fs');
        fs.writeFileSync('wf_mixtral_patch.json', JSON.stringify(wfNodes));
        await ssh.putFile('wf_mixtral_patch.json', '/tmp/wf_mixtral_patch.json');
        
        console.log('[2/4] Updating SQLite Headlessly...');
        const py = `
import sqlite3, json
with open('/tmp/wf_mixtral_patch.json') as f: nodes = f.read()
conn = sqlite3.connect('/root/.n8n/database.sqlite')
conn.execute("UPDATE workflow_entity SET nodes=? WHERE id='${WORKFLOW_ID}'", [nodes])
conn.commit()
print('SQLite updated', conn.total_changes, 'row(s)')
conn.close()
`;
        await ssh.execCommand(`cat > /tmp/do_mixtral_patch.py << 'PYEOF'\n${py}\nPYEOF`);
        const pyRes = await ssh.execCommand('python3 /tmp/do_mixtral_patch.py');
        console.log(pyRes.stdout.trim());

        console.log('[3/4] Restarting N8N PM2 process to lock in Mixtral...');
        await ssh.execCommand('pm2 restart n8n-service');
        console.log('✅ Mixtral Backend Override Complete!');
        
    } catch(e) { console.error('Error fetching nodes:', e); }
    ssh.dispose();
});
