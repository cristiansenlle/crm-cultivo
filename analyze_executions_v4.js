const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });

        const query = "SELECT e.id, d.data FROM execution_entity e JOIN execution_data d ON e.id = d.executionId WHERE e.workflowId = 'scpZdPe5Cp4MG98G' ORDER BY e.startedAt DESC LIMIT 10;";
        const localPath = './fetch_execs.sql';
        fs.writeFileSync(localPath, query);
        
        const remotePath = '/opt/crm-cannabis/fetch_execs.sql';
        await ssh.putFile(localPath, remotePath);
        
        const res = await ssh.execCommand(`sqlite3 -json /root/.n8n/database.sqlite < ${remotePath}`);
        
        if (!res.stdout) {
            console.log('No data found or JSON output not supported.');
            ssh.dispose();
            return;
        }

        const rawData = JSON.parse(res.stdout);
        console.log(`Found ${rawData.length} executions.`);

        rawData.forEach(row => {
            const id = row.id;
            const data = JSON.parse(row.data);
            const runData = data.resultData.runData;

            console.log(`\n=== [ID ${id}] CONVERSATION ===`);

            // 1. Identify User Prompt
            let userInput = "N/A";
            const inboundNode = Object.keys(runData).find(k => k.toLowerCase().includes('inbound'));
            if (inboundNode && runData[inboundNode][0]?.data?.main?.[0]?.[0]?.json) {
                const item = runData[inboundNode][0].data.main[0][0].json;
                userInput = item.body?.body || item.body || "N/A";
            }
            console.log(`USER: ${userInput}`);

            // 2. Identify Agent Used & Final Response
            const agentNodes = Object.keys(runData).filter(k => k.toLowerCase().includes('agent'));
            agentNodes.forEach(an => {
                const run = runData[an][0];
                if (run.data && run.data.main && run.data.main[0]) {
                     console.log(`AGENT [${an}] used.`);
                }
                if (run.error) {
                    console.log(`AGENT [${an}] ERROR: ${run.error.message}`);
                }
            });

            // 3. Final Response Node
            const respNode = Object.keys(runData).find(k => k.toLowerCase().includes('responder') || k.toLowerCase().includes('echo'));
            if (respNode && runData[respNode][0]?.data?.main?.[0]?.[0]?.json) {
                const item = runData[respNode][0].data.main[0][0].json;
                console.log(`BOT: ${item.response || item.body || JSON.stringify(item)}`);
            }
            
            console.log('---');
        });

        ssh.dispose();
        fs.unlinkSync(localPath);
    } catch (err) {
        console.error('Analysis failed:', err.message);
    }
})();
