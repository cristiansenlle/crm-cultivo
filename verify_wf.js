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
const db = new sqlite3.Database('/root/.n8n/database.sqlite');
db.get("SELECT nodes FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G'", (err, row) => {
    if(row) {
        const nodes = JSON.parse(row.nodes);
        const aiNode = nodes.find(n => n.name === 'AI Agent (Function Calling)');
        if (aiNode) {
            console.log("Found AI Node. Prompt preview:");
            console.log(aiNode.parameters.options.systemMessage.substring(0, 150) + '...');
            console.log("Has consultar_salas in prompt?", aiNode.parameters.options.systemMessage.includes('consultar_salas'));
            console.log("Has EJ: TELEMETRÍA REQUIERE BUSCAR EXACTAMENTE LA SALA CON consultar_salas?", aiNode.parameters.options.systemMessage.includes('EJ: TELEMETRÍA REQUIERE BUSCAR EXACTAMENTE LA SALA CON consultar_salas'));
        }
        
        const teleTool = nodes.find(n => n.name === 'cargar_telemetria');
        if (teleTool) {
             console.log("cargar_telemetria payload names:", teleTool.parameters.parametersBody.values.map(v => v.name));
        }

        const salaTool = nodes.find(n => n.name === 'consultar_salas');
        if (salaTool) {
             console.log("consultar_salas tool exists:", !!salaTool);
        }
    }
});
db.close();
        `;
        
        await ssh.execCommand('cat > /tmp/verify_wf.js', { stdin: remoteScript });
        const res = await ssh.execCommand('node /tmp/verify_wf.js');

        console.log(res.stdout);
        console.log(res.stderr);
        
        ssh.dispose();
    } catch(e) {
        console.error(e);
        ssh.dispose();
    }
}
checkNodes();
