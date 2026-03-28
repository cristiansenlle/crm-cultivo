const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

ssh.connect({
    host: '109.199.99.126',
    username: 'root',
    password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
}).then(async () => {
    const r = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT nodes FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';\"");
    const nodes = JSON.parse(r.stdout);
    
    // Verify clean prompts
    const agents = nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.agent');
    agents.forEach(a => {
        const msg = a.parameters?.options?.systemMessage || '';
        console.log(`${a.name}: length=${msg.length}, has MIDDLEWARE=${msg.includes('MIDDLEWARE AGRONÓMICO')}`);
    });
    
    // Verify reportar_evento URL still points to middleware
    const reportar = nodes.find(n => n.name === 'reportar_evento');
    const reportarGroq = nodes.find(n => n.name === 'reportar_evento_groq');
    console.log('\nreportar_evento URL:', reportar?.parameters?.url);
    console.log('reportar_evento_groq URL:', reportarGroq?.parameters?.url);
    console.log('\nreportar_evento placeholders:', reportar?.parameters?.placeholderDefinitions?.values?.map(v => `${v.name}: ${v.description.substring(0,60)}`).join('\n  '));
    
    ssh.dispose();
}).catch(e => console.error(e));
