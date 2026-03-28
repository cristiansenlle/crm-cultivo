const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

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
            console.log("Extracting live nodes...");
            execSync('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id=\\'scpZdPe5Cp4MG98G\\';" > /tmp/live_nodes_v14.txt');
            const nodes = JSON.parse(fs.readFileSync('/tmp/live_nodes_v14.txt', 'utf8'));
            
            const lotesGroq = nodes.find(n => n.name === 'consultar_lotes_groq');
            console.log("\\n=== GROQ LOTES ===");
            console.log(JSON.stringify(lotesGroq, null, 2));

            const salasGroq = nodes.find(n => n.name === 'consultar_salas_groq');
            console.log("\\n=== GROQ SALAS ===");
            console.log(JSON.stringify(salasGroq, null, 2));

        } catch (e) {
             console.log("ERROR:", e.message);
        }
        `;
        
        await ssh.execCommand('cat > /tmp/check_groq.js', { stdin: script });
        const res = await ssh.execCommand('node /tmp/check_groq.js');
        console.log(res.stdout);
        ssh.dispose();
    } catch(e) {
        console.error(e);
        if (ssh) ssh.dispose();
    }
}
check();
