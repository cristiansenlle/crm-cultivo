const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' }).then(async () => {
    // Compare encryption format of existing vs new credential
    const r1 = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT data FROM credentials_entity WHERE type='groqApi';\"");
    console.log('Groq cred (existing):', r1.stdout.substring(0, 120));
    
    const r2 = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT data FROM credentials_entity WHERE id='gGemFlash2026001';\"");
    console.log('Gemini cred (new):', r2.stdout.substring(0, 120));
    
    // Check workflow node is correctly set
    const r3 = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT nodes FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';\"");
    const nodes = JSON.parse(r3.stdout);
    const gemNode = nodes.find(n => n.name && n.name.includes('Gemini'));
    console.log('\nGemini workflow node:', JSON.stringify(gemNode, null, 2));
    
    // Check if n8n is accessible (running correctly)
    const r4 = await ssh.execCommand('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5678/healthz');
    console.log('\nn8n health check:', r4.stdout);
    
    ssh.dispose();
});
