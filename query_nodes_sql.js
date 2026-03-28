const { NodeSSH } = require('node-ssh');
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
db.get("SELECT json_extract(value, '$.parameters.options.systemMessage') as prompt FROM workflow_entity, json_each(nodes) WHERE id='scpZdPe5Cp4MG98G' AND json_extract(value, '$.name') = 'AI Agent (Function Calling)';", (err, row) => {
    if(row) {
        console.log("=== AI SYSTEM PROMPT ===");
        console.log(row.prompt);
    } else {
        console.log(err || "Row not found");
    }
});

db.get("SELECT json_extract(value, '$.parameters.parametersBody.values') as payload FROM workflow_entity, json_each(nodes) WHERE id='scpZdPe5Cp4MG98G' AND json_extract(value, '$.name') = 'cargar_telemetria';", (err, row) => {
    if(row) {
        console.log("=== TELEMETRY PAYLOAD ===");
        console.log(row.payload);
    }
});
db.close();
        `;
        
        await ssh.execCommand('cat > /tmp/query_nodes_sql.js', { stdin: remoteScript });
        const res = await ssh.execCommand('node /tmp/query_nodes_sql.js');

        console.log(res.stdout);
        console.log(res.stderr);
        
        ssh.dispose();
    } catch(e) {
        console.error(e);
        ssh.dispose();
    }
}
checkNodes();
