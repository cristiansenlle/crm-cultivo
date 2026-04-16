const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

async function deepCheck() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'HIDDEN_SECRET_BY_AI' 
        });

        const execId = 283; // Latest success ID from previous step
        
        console.log(`--- Deep dive into execution: ${execId} ---`);
        // We write to a file first to avoid possible data truncation in stdout if it's too big
        await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "SELECT data FROM execution_entity WHERE id = ${execId};" > /tmp/exec_${execId}.json`);
        
        console.log('Downloading execution data...');
        await ssh.getFile('c:/Users/Cristian/.gemini/antigravity/crm cannabis/exec_data.json', `/tmp/exec_${execId}.json`);
        
        const data = JSON.parse(fs.readFileSync('exec_data.json', 'utf8'));
        console.log('Available nodes in execution log:', Object.keys(data.resultData.runData));

        // Check the last nodes executed
        const runData = data.resultData.runData;
        for (const nodeName in runData) {
            const entry = runData[nodeName][0];
            console.log(`Node: ${nodeName}, Status: ${entry.startTime ? 'Executed' : 'Skipped/Error'}`);
            if (nodeName.includes('WhatsApp') || nodeName.includes('Format')) {
                console.log(`Details for ${nodeName}:`, JSON.stringify(entry.data, null, 2));
            }
        }

        ssh.dispose();
    } catch (err) {
        console.error('Deep check failed:', err.message);
    }
}

deepCheck();
