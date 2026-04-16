const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function patchSystemPrompt() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        // Extract the current system prompt and AI Agent node config
        const extract = `
const fs = require('fs');
const { execSync } = require('child_process');

execSync('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id=\\'scpZdPe5Cp4MG98G\\';" > /tmp/sp_nodes.json');
let nodes = JSON.parse(fs.readFileSync('/tmp/sp_nodes.json', 'utf8'));

// Find AI Agent nodes and print their system prompt
nodes.forEach(n => {
    if (n.type && n.type.includes('agent') && n.parameters && n.parameters.systemMessage) {
        console.log('AGENT:', n.name);
        console.log('PROMPT START>>>', n.parameters.systemMessage.substring(0, 500), '<<<');
    }
});
`;
        await ssh.execCommand('cat > /tmp/sp_extract.js', { stdin: extract });
        const r = await ssh.execCommand('node /tmp/sp_extract.js');
        console.log(r.stdout);
        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
patchSystemPrompt();
