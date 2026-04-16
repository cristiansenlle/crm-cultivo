const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function inspectExec() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'HIDDEN_SECRET_BY_AI' 
        });

        const execId = 284;
        
        console.log(`--- Inspecting execution ${execId} ---`);
        
        // We use a simpler query to get the raw data
        const res = await ssh.execCommand(`sqlite3 -json /root/.n8n/database.sqlite "SELECT data FROM execution_entity WHERE id = ${execId};"`);
        
        if (!res.stdout) {
            console.log('No data found for ID', execId);
            return;
        }

        const rows = JSON.parse(res.stdout);
        const data = JSON.parse(rows[0].data);
        const runData = data.resultData.runData;
        
        console.log('Nodes Executed:', Object.keys(runData).join(', '));
        
        for (const nodeName in runData) {
            const entry = runData[nodeName][0];
            console.log(`\nNode: ${nodeName}`);
            console.log(`Status: ${entry.startTime ? 'Executed' : 'Skipped'}`);
            if (entry.error) {
                console.log('ERROR:', JSON.stringify(entry.error, null, 2));
            }
            if (nodeName.includes('WhatsApp') || nodeName.includes('Format') || nodeName.includes('AI Agent')) {
                console.log('Output Data:', JSON.stringify(entry.data, null, 2).substring(0, 1000));
            }
        }

        ssh.dispose();
    } catch (err) {
        console.error('Inspection failed:', err.message);
    }
}

inspectExec();
