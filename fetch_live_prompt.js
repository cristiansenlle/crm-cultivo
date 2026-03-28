const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function traceLiveNodes() {
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
            console.log("Dumping live nodes from SQLite...");
            execSync('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id=\\'scpZdPe5Cp4MG98G\\';" > /tmp/live_nodes.txt');
            const dataStr = fs.readFileSync('/tmp/live_nodes.txt', 'utf8');
            try {
                const nodes = JSON.parse(dataStr);
                const ai = nodes.find(n => n.name === 'AI Agent (Function Calling)');
                console.log("\\n=== AI AGENT PROMPT ===");
                console.log(ai.parameters.options.systemMessage);
                
                const tele = nodes.find(n => n.name === 'cargar_telemetria');
                console.log("\\n=== CARGAR_TELEMETRIA SCHEMA ===");
                if(tele && tele.parameters) console.log(JSON.stringify(tele.parameters.placeholderDefinitions));

            } catch (e) {
                 console.log("ERROR PARSING JSON:", e.message);
            }
        } catch(e) {
            console.error("Fatal:", e.message);
        }
        `;
        
        await ssh.execCommand('cat > /tmp/live_trace.js', { stdin: script });
        const res = await ssh.execCommand('node /tmp/live_trace.js');
        console.log(res.stdout);
        ssh.dispose();
    } catch(e) {
        console.error(e);
        if (ssh) ssh.dispose();
    }
}
traceLiveNodes();
