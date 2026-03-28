const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function checkNodes() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        const remoteScript = `
const sqlite3 = require('sqlite3');
const fs = require('fs');

const db = new sqlite3.Database('/root/.n8n/database.sqlite');
db.get("SELECT nodes, connections FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G'", (err, row) => {
    if(row) {
        fs.writeFileSync('/tmp/live_nodes.json', row.nodes);
        fs.writeFileSync('/tmp/live_connections.json', row.connections || '{}');
    }
});
db.close();
        `;
        
        await ssh.execCommand('cat > /tmp/check_wf.js', { stdin: remoteScript });
        await ssh.execCommand('node /tmp/check_wf.js');

        await ssh.getFile('live_nodes_latest.json', '/tmp/live_nodes.json');
        await ssh.getFile('live_connections_latest.json', '/tmp/live_connections.json');
        console.log("Downloaded live node definitions.");
        
        // Let's parse and check locally
        const nodes = JSON.parse(fs.readFileSync('live_nodes_latest.json', 'utf8'));
        const aiNode = nodes.find(n => n.name === 'AI Agent (Function Calling)' || n.type === '@n8n/n8n-nodes-langchain.agent');
        
        console.log("=== AI SYSTEM PROMPT ===");
        if (aiNode) {
            console.log(aiNode.parameters.options.systemMessage);
        } else {
            console.log("AI Node not found!");
        }

        const salasTool = nodes.find(n => n.name === 'consultar_salas');
        if (salasTool) {
            console.log("YES: consultar_salas tool is in the nodes array.");
        } else {
            console.log("NO: consultar_salas tool is missing!");
        }

        const teleTool = nodes.find(n => n.name === 'cargar_telemetria');
        if (teleTool) {
             console.log("YES: cargar_telemetria is present.");
             console.log("Payload:", teleTool.parameters.parametersBody.values.map(v => v.name));
        }

        ssh.dispose();
    } catch(e) {
        console.error(e);
        ssh.dispose();
    }
}
checkNodes();
