const fs = require('fs');
const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function cleanNode() {
    try {
        const d = JSON.parse(fs.readFileSync('patched_creds_export.json', 'utf8'));
        const wf = Array.isArray(d) ? d[0] : (d['0'] || d);

        // Remove the node
        const oldLen = wf.nodes.length;
        wf.nodes = wf.nodes.filter(n => n.name !== 'Bypass PG' && n.type !== 'n8n-nodes-base.executeCommand');
        console.log(`Removed ${oldLen - wf.nodes.length} bad nodes.`);

        // Remove connections to/from it
        if (wf.connections) {
            for (let sourceNode in wf.connections) {
                if (sourceNode === 'Bypass PG') {
                    delete wf.connections[sourceNode];
                    continue;
                }
                for (let outputIndex in wf.connections[sourceNode]) {
                    let targets = wf.connections[sourceNode][outputIndex];
                    if (Array.isArray(targets)) {
                        wf.connections[sourceNode][outputIndex] = targets.filter(t => t.node !== 'Bypass PG');
                    }
                }
            }
        }
        
        fs.writeFileSync('final_clean_crm.json', JSON.stringify(wf, null, 2));
        console.log("Saved to final_clean_crm.json");
        
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });
        
        const wfString = JSON.stringify(wf.nodes).replace(/'/g, "''");
        const connString = JSON.stringify(wf.connections).replace(/'/g, "''");
        
        console.log("Applying to SQLite...");
        await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "UPDATE workflow_entity SET nodes='${wfString}', connections='${connString}' WHERE id='scpZdPe5Cp4MG98G';"`);
        await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "UPDATE workflow_history SET nodes='${wfString}', connections='${connString}' WHERE versionId='2998cacd-6008-476a-b25b-b0c472316cd9';"`);
        
        console.log("Restarting n8n...");
        await ssh.execCommand('pm2 restart n8n-service');
        await new Promise(r => setTimeout(r, 15000));
        
        console.log("Running local payload test...");
        require('child_process').execSync('node test_actual_fresh.js', {stdio: 'inherit'});

        ssh.dispose();
    } catch(e) {
        console.error(e);
        if (ssh) ssh.dispose();
    }
}
cleanNode();
