const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function findAndPatchPrompt() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        // Find system prompt parameter - try all possible keys
        const extract = `
const fs = require('fs');
const { execSync } = require('child_process');

execSync('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id=\\'scpZdPe5Cp4MG98G\\';" > /tmp/sp2.json');
let nodes = JSON.parse(fs.readFileSync('/tmp/sp2.json', 'utf8'));

// Find ALL agent-like nodes and print ALL parameter keys
nodes.forEach(n => {
    if (n.type && (n.type.includes('agent') || n.type.includes('Agent') || n.type.includes('lmChat'))) {
        console.log('NODE TYPE:', n.type, '| NAME:', n.name);
        console.log('PARAM KEYS:', Object.keys(n.parameters || {}));
        const params = n.parameters || {};
        // Print any text-heavy field that might be the system prompt
        for (const [k, v] of Object.entries(params)) {
            if (typeof v === 'string' && v.length > 50) {
                console.log('  FIELD:', k, ':', v.substring(0, 150));
            }
            if (typeof v === 'object' && v !== null) {
                for (const [k2, v2] of Object.entries(v)) {
                    if (typeof v2 === 'string' && v2.length > 50) {
                        console.log('  NESTED', k+'.'+k2, ':', v2.substring(0, 150));
                    }
                }
            }
        }
        console.log('---');
    }
});
`;
        await ssh.execCommand('cat > /tmp/sp2.js', { stdin: extract });
        const r = await ssh.execCommand('node /tmp/sp2.js');
        console.log(r.stdout);
        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
findAndPatchPrompt();
