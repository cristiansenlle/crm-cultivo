const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

(async () => {
    let report = "# Bot Execution History Report\n\n";
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });

        const query = "SELECT e.id, d.data FROM execution_entity e JOIN execution_data d ON e.id = d.executionId WHERE e.workflowId = 'scpZdPe5Cp4MG98G' ORDER BY e.startedAt DESC LIMIT 15;";
        const localPath = './fetch_execs.sql';
        fs.writeFileSync(localPath, query);
        
        const remotePath = '/opt/crm-cannabis/fetch_execs.sql';
        await ssh.putFile(localPath, remotePath);
        
        const res = await ssh.execCommand(`sqlite3 -json /root/.n8n/database.sqlite < ${remotePath}`);
        
        if (!res.stdout) {
            report += "No data found.\n";
            fs.writeFileSync('log_report.md', report);
            ssh.dispose();
            return;
        }

        const rawData = JSON.parse(res.stdout);
        report += `Found ${rawData.length} executions.\n\n`;

        rawData.forEach(row => {
            const id = row.id;
            let data;
            try { data = JSON.parse(row.data); } catch (e) { return; }

            if (!data.resultData || !data.resultData.runData) return;

            const runData = data.resultData.runData;
            report += `## [ID ${id}] Execution\n`;

            // 1. Inbound
            const inboundNode = Object.keys(runData).find(k => k.toLowerCase().includes('inbound'));
            if (inboundNode && runData[inboundNode][0]?.data?.main?.[0]?.[0]?.json) {
                const item = runData[inboundNode][0].data.main[0][0].json;
                report += `**USER:** ${item.body?.body || item.body || JSON.stringify(item)}\n\n`;
            }

            // 2. Agents
            const agentNodes = Object.keys(runData).filter(k => k.toLowerCase().includes('agent'));
            agentNodes.forEach(an => {
                const run = runData[an][0];
                report += `- **AGENT [${an}]:** Used. (Status: ${run.error ? 'ERROR' : 'OK'})\n`;
                if (run.error) report += `  - **ERROR:** ${run.error.message}\n`;
                
                if (run.data?.main?.[0]?.[0]?.json) {
                    const out = run.data.main[0][0].json;
                    report += `  - **Output Snippet:** ${JSON.stringify(out).substring(0, 300)}...\n`;
                }
            });

            // 3. Response
            const respNode = Object.keys(runData).find(k => k.toLowerCase().includes('responder') || k.toLowerCase().includes('echo') || k.toLowerCase().includes('outbound'));
            if (respNode && runData[respNode][0]?.data?.main?.[0]?.[0]?.json) {
                const item = runData[respNode][0].data.main[0][0].json;
                report += `\n**BOT:** ${item.response || item.body || JSON.stringify(item)}\n`;
            }
            
            report += "\n---\n\n";
        });

        fs.writeFileSync('log_report.md', report);
        ssh.dispose();
        fs.unlinkSync(localPath);
    } catch (err) {
        fs.writeFileSync('log_report.md', report + "\nFAILED: " + err.message);
    }
})();
