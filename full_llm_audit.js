const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' }).then(async () => {

    // Get ALL workflows
    const allWf = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT id, name FROM workflow_entity;\"");
    console.log('=== All Workflows ===');
    console.log(allWf.stdout);

    // Scan the target workflow for ALL Gemini and Groq related nodes
    const r = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT nodes FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';\"");
    const nodes = JSON.parse(r.stdout);

    console.log(`\n=== All nodes (${nodes.length} total) ===`);
    nodes.forEach((n, i) => {
        // Show any node that references Gemini, Groq, Google, LLM
        const t = n.type || '';
        const nameStr = JSON.stringify(n.parameters || {}).toLowerCase();
        const credStr = JSON.stringify(n.credentials || {}).toLowerCase();
        if (t.includes('lmChat') || t.includes('Google') || t.includes('Groq') || t.includes('openRouter') ||
            nameStr.includes('gemini') || nameStr.includes('groq') || credStr.includes('google') || credStr.includes('groq') || credStr.includes('gemini')) {
            console.log(`\n[${i}] ${n.name} | type: ${t}`);
            console.log('  params:', JSON.stringify(n.parameters).substring(0, 200));
            console.log('  creds:', JSON.stringify(n.credentials || {}));
        }
    });

    ssh.dispose();
}).catch(e => console.error(e));
