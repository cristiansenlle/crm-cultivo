const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

ssh.connect({
    host: '109.199.99.126',
    username: 'root',
    password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
}).then(async () => {
    // Get the live workflow nodes from SQLite
    const r = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT nodes FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';\"");
    
    if (r.stdout && r.stdout.length > 100) {
        fs.writeFileSync('live_workflow_nodes_now.json', r.stdout);
        
        // Parse and check the reportar_evento nodes
        const nodes = JSON.parse(r.stdout);
        const targets = nodes.filter(n => n.name && (n.name === 'reportar_evento' || n.name === 'reportar_evento_groq'));
        
        targets.forEach(n => {
            console.log(`\n=== ${n.name} ===`);
            console.log('URL:', n.parameters?.url);
            console.log('Placeholders:', n.parameters?.placeholderDefinitions?.values?.map(v => v.name).join(', '));
        });
    } else {
        console.error('No data returned. stderr:', r.stderr);
    }
    
    ssh.dispose();
}).catch(e => console.error(e));
