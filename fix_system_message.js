const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const WORKFLOW_ID = 'scpZdPe5Cp4MG98G';

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' }).then(async () => {
    console.log('[1/4] Fetching SQLite Data...');
    const r = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT nodes FROM workflow_entity WHERE id='" + WORKFLOW_ID + "';\" -json");
    try {
        const rows = JSON.parse(r.stdout);
        const wfNodes = JSON.parse(rows[0].nodes);

        const microPrompt = `Eres AgronomyBot 360. Extrae y formatea en lenguaje natural. Regla Clave: NUNCA ASUMAS IDs NI NOMBRES, usa los tools de consulta primero. Si hay fallos de fuzzy match, pregúntale de nuevo al humano mostrándole opciones reales. Si usas tools de inserción, devuelve el resultado sin JSON crudo.`;

        // We explicitly overwrite systemMessage in the nested options array
        wfNodes.forEach(n => {
            if (n.type && n.type.includes('Agent')) {
                n.parameters = n.parameters || {};
                n.parameters.options = n.parameters.options || {};
                
                if (n.parameters.options.systemMessage) {
                    console.log(`Node [${n.name}] Truncating systemMessage from ${n.parameters.options.systemMessage.length} chars to ${microPrompt.length} chars`);
                } else {
                    console.log(`Node [${n.name}] Creating systemMessage constraint`);
                }
                
                n.parameters.options.systemMessage = microPrompt;
                
                // Remove the bogus text property if we created it
                if (n.parameters.text) {
                    delete n.parameters.text;
                }
            }
        });

        const fs = require('fs');
        fs.writeFileSync('wf_prompt_patch.json', JSON.stringify(wfNodes));
        await ssh.putFile('wf_prompt_patch.json', '/tmp/wf_prompt_patch.json');
        
        console.log('[2/4] Updating SQLite Headlessly...');
        const py = `
import sqlite3, json
with open('/tmp/wf_prompt_patch.json') as f: nodes = f.read()
conn = sqlite3.connect('/root/.n8n/database.sqlite')
conn.execute("UPDATE workflow_entity SET nodes=? WHERE id='${WORKFLOW_ID}'", [nodes])
conn.commit()
print('SQLite updated', conn.total_changes, 'row(s)')
conn.close()
`;
        await ssh.execCommand(`cat > /tmp/do_prompt_patch.py << 'PYEOF'\n${py}\nPYEOF`);
        const pyRes = await ssh.execCommand('python3 /tmp/do_prompt_patch.py');
        console.log(pyRes.stdout.trim());

        console.log('[3/4] Restarting N8N PM2 process to flush all active memories...');
        await ssh.execCommand('pm2 restart n8n-service');
        console.log('✅ Final Prompt Surgery Complete!');
        
    } catch(e) { console.error('Error fetching nodes:', e); }
    ssh.dispose();
});
