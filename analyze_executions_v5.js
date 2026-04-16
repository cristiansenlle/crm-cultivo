const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });

        const query = "SELECT e.id, d.data FROM execution_entity e JOIN execution_data d ON e.id = d.executionId WHERE e.workflowId = 'scpZdPe5Cp4MG98G' ORDER BY e.startedAt DESC LIMIT 10;";
        const localPath = './fetch_execs.sql';
        fs.writeFileSync(localPath, query);
        
        const remotePath = '/opt/crm-cannabis/fetch_execs.sql';
        await ssh.putFile(localPath, remotePath);
        
        const res = await ssh.execCommand(`sqlite3 -json /root/.n8n/database.sqlite < ${remotePath}`);
        
        if (!res.stdout) {
            console.log('No data found.');
            ssh.dispose();
            return;
        }

        const rawData = JSON.parse(res.stdout);
        console.log(`Found ${rawData.length} executions.`);

        rawData.forEach(row => {
            const id = row.id;
            let data;
            try {
                data = JSON.parse(row.data);
            } catch (e) {
                console.log(`[ID ${id}] FAILED TO PARSE JSON`);
                return;
            }

            if (!data.resultData || !data.resultData.runData) {
                console.log(`[ID ${id}] NO RUNDATA (Keys: ${Object.keys(data).join(', ')})`);
                return;
            }

            const runData = data.resultData.runData;
            console.log(`\n=== [ID ${id}] CONVERSATION ===`);

            // 1. Inbound
            const inboundNode = Object.keys(runData).find(k => k.toLowerCase().includes('inbound'));
            if (inboundNode && runData[inboundNode][0]?.data?.main?.[0]?.[0]?.json) {
                const item = runData[inboundNode][0].data.main[0][0].json;
                console.log(`USER: ${item.body?.body || item.body || JSON.stringify(item)}`);
            }

            // 2. Agents
            const agentNodes = Object.keys(runData).filter(k => k.toLowerCase().includes('agent'));
            agentNodes.forEach(an => {
                const run = runData[an][0];
                console.log(`AGENT [${an}] used.`);
                if (run.error) console.log(`AGENT [${an}] ERROR: ${run.error.message}`);
                
                // Try to find output of agent
                if (run.data?.main?.[0]?.[0]?.json) {
                    const out = run.data.main[0][0].json;
                    console.log(`AGENT OUTPUT SNIPPET: ${JSON.stringify(out).substring(0, 500)}`);
                }
            });

            // 3. Response
            const respNode = Object.keys(runData).find(k => k.toLowerCase().includes('responder') || k.toLowerCase().includes('echo') || k.toLowerCase().includes('outbound'));
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
