const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' }).then(async () => {
    const r = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT nodes FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';\" -json");
    try {
        const rows = JSON.parse(r.stdout);
        const wf = rows[0];
        const nodes = JSON.parse(wf.nodes);
        let found = false;
        nodes.forEach(n => {
            if (JSON.stringify(n).includes('llama-3.3-70b-versatile')) {
                console.log('🔴 FOUND Llama 70B in node:', n.name);
                found = true;
            }
            if (JSON.stringify(n).includes('mixtral')) {
                console.log('🟢 FOUND MIXTRAL in node:', n.name);
                found = true;
            }
        });
        if(!found) console.log('Neither found!');
    } catch(e) { console.error(e.message); }
    ssh.dispose();
});
