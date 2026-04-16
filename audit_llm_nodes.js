const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' }).then(async () => {
    const r = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT nodes FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';\"");
    const nodes = JSON.parse(r.stdout);

    // Print current state of all LLM-related nodes
    const llmNodes = nodes.filter(n =>
        n.type && (n.type.includes('lmChat') || n.type.includes('agent'))
    );
    llmNodes.forEach(n => {
        console.log(`\n[${n.name}] type: ${n.type}`);
        console.log('  model:', n.parameters?.model || n.parameters?.modelName || 'N/A');
        console.log('  creds:', JSON.stringify(n.credentials || {}));
    });

    ssh.dispose();
}).catch(e => console.error(e));
