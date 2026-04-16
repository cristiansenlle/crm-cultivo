const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkAfterPatch() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const script = `
        const fs = require('fs');
        const { execSync } = require('child_process');
        
        try {
            execSync('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id=\\'scpZdPe5Cp4MG98G\\';" > /tmp/live_nodes_v12.txt');
            const nodes = JSON.parse(fs.readFileSync('/tmp/live_nodes_v12.txt', 'utf8'));
            
            const ai = nodes.find(n => n.name === 'AI Agent (Function Calling)');
            if(ai) {
                console.log("=== AI PROMPT FRAGMENT ===");
                console.log(ai.parameters.options.systemMessage.substring(1000, 2500));
            }

            const salas = nodes.find(n => n.name === 'consultar_salas');
            if(salas) {
                console.log("\\n=== SALAS TOOL DESC ===");
                console.log(salas.parameters.description);
                console.log("\\n=== SALAS FULL ===");
                console.log(JSON.stringify(salas, null, 2));
            }

            const lotes = nodes.find(n => n.name === 'consultar_lotes');
            if(lotes) {
                console.log("\\n=== LOTES URL ===");
                console.log(lotes.parameters.url);
            }

        } catch (e) {
             console.log("ERROR:", e.message);
        }
        `;
        
        await ssh.execCommand('cat > /tmp/check_v12.js', { stdin: script });
        const res = await ssh.execCommand('node /tmp/check_v12.js');
        console.log(res.stdout);
        ssh.dispose();
    } catch(e) {
        console.error(e);
        if (ssh) ssh.dispose();
    }
}
checkAfterPatch();
