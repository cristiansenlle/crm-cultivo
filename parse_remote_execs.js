const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function checkRecentExecs() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        const remoteScript = `
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('/root/.n8n/database.sqlite');
db.all("SELECT id, startedAt, data FROM execution_entity WHERE workflowId='scpZdPe5Cp4MG98G' ORDER BY startedAt DESC LIMIT 3", (err, rows) => {
    if(err) { console.error(err); return; }
    
    rows.forEach(row => {
        console.log("\\n\\n=== EXECUTION ID: " + row.id + " at " + row.startedAt + " ===");
        try {
            const data = JSON.parse(row.data);
            const steps = data.resultData.runData;
            
            // Print AI agent system prompt input if present
            const aiNodeRuns = steps['AI Agent (Function Calling)'];
            if(aiNodeRuns) {
                console.log("AI Agent ran.");
            }

            Object.keys(steps).forEach(nodeName => {
                const toolCalls = steps[nodeName].filter(r => r.data && r.data.main && r.data.main[0]);
                if (toolCalls.length > 0) {
                    console.log('Node executed:', nodeName);
                    toolCalls.forEach((run, i) => {
                         const itemData = run.data.main[0].map(item => item.json);
                         console.log(\`  Run \${i}:\`, JSON.stringify(itemData).substring(0, 300));
                    });
                }
            });
        } catch(e) {
            console.log("Parse error on id", row.id, e.message);
        }
    });
});
db.close();
        `;
        
        await ssh.execCommand('cat > /tmp/parse_execs.js', { stdin: remoteScript });
        const res = await ssh.execCommand('node /tmp/parse_execs.js');

        console.log(res.stdout);
        console.log(res.stderr);
        
        ssh.dispose();
    } catch(e) {
        console.error(e);
        ssh.dispose();
    }
}
checkRecentExecs();
