const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

async function check() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        const script = `
const fs = require('fs');
const { execSync } = require('child_process');

try {
    execSync('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id=\\'scpZdPe5Cp4MG98G\\';" > /tmp/live_check.json');
    const nodes = JSON.parse(fs.readFileSync('/tmp/live_check.json', 'utf8'));
    
    const salasNodes = nodes.filter(n => n.name.includes('consultar_salas'));
    salasNodes.forEach(n => {
        console.log("NODE:", n.name);
        console.log("URL:", n.parameters.url);
        console.log("DESC:", n.parameters.description ? n.parameters.description.substring(0, 100) : 'NONE');
        console.log("---");
    });
} catch (e) {
    console.log("ERROR:", e.message);
}
`;
        await ssh.execCommand('cat > /tmp/live_check.js', { stdin: script });
        const res = await ssh.execCommand('node /tmp/live_check.js');
        console.log(res.stdout);
        ssh.dispose();
    } catch(e) { console.error(e); if (ssh) ssh.dispose(); }
}
check();
