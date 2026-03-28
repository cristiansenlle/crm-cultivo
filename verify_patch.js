const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function verifyPatch() {
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
            console.log("Dumping fresh nodes...");
            execSync('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id=\\'scpZdPe5Cp4MG98G\\';" > /tmp/check_v13.txt');
            const nodes = JSON.parse(fs.readFileSync('/tmp/check_v13.txt', 'utf8'));
            
            const lotes = nodes.find(n => n.name === 'consultar_lotes');
            console.log("\\n=== LIVE URL FOR LOTES ===");
            console.log(lotes ? lotes.parameters.url : 'NOT FOUND');

            const salas = nodes.find(n => n.name === 'consultar_salas');
            console.log("\\n=== LIVE URL FOR SALAS ===");
            console.log(salas ? salas.parameters.url : 'NOT FOUND');

        } catch (e) {
             console.log("ERROR:", e.message);
        }
        `;
        
        await ssh.execCommand('cat > /tmp/verify.js', { stdin: script });
        const res = await ssh.execCommand('node /tmp/verify.js');
        console.log(res.stdout);
        ssh.dispose();
    } catch(e) {
        console.error(e);
        if (ssh) ssh.dispose();
    }
}
verifyPatch();
