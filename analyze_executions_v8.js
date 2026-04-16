const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

(async () => {
    let report = "# Bot Execution History - Deep Dive\n\n";
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });

        const query = "SELECT e.id, d.data FROM execution_entity e JOIN execution_data d ON e.id = d.executionId WHERE e.workflowId = 'scpZdPe5Cp4MG98G' ORDER BY e.startedAt DESC LIMIT 7;";
        const localPath = './fetch_v8.sql';
        fs.writeFileSync(localPath, query);
        
        const remotePath = '/opt/crm-cannabis/fetch_v8.sql';
        await ssh.putFile(localPath, remotePath);
        
        const res = await ssh.execCommand(`sqlite3 -json /root/.n8n/database.sqlite < ${remotePath}`);
        
        if (!res.stdout) {
             fs.writeFileSync('log_analysis_v8.md', "No data found.");
             ssh.dispose();
             return;
        }

        const rawData = JSON.parse(res.stdout);

        rawData.forEach(row => {
            const arr = JSON.parse(row.data);
            const cache = new Map();
            
            function deref(val, depth = 0) {
                if (depth > 15) return "..."; // Safety
                if (typeof val === 'string' && /^\d+$/.test(val)) {
                    const idx = parseInt(val);
                    if (cache.has(idx)) return cache.get(idx);
                    if (arr[idx] !== undefined) {
                        // Set a placeholder to handle circularity
                        cache.set(idx, "[Circular]");
                        const result = deref(arr[idx], depth + 1);
                        cache.set(idx, result);
                        return result;
                    }
                }
                if (Array.isArray(val)) return val.map(v => deref(v, depth + 1));
                if (val && typeof val === 'object') {
                    const obj = {};
                    for (const k in val) obj[k] = deref(val[k], depth + 1);
                    return obj;
                }
                return val;
            }

            // In n8n v1 compressed format:
            // arr[0] is the root object headers
            // We want 'resultData'
            const root = arr[0];
            const resultData = deref(root.resultData);
            const runData = resultData?.runData;

            if (!runData) {
                report += `## [ID ${row.id}] No runData found.\n---\n\n`;
                return;
            }

            report += `## [ID ${row.id}] Interaction\n`;

            // Identify Agent used
            const groqUsed = Object.keys(runData).some(k => k.toLowerCase().includes('groq'));
            const orUsed = Object.keys(runData).some(k => k.toLowerCase().includes('openrouter'));
            report += `**Agent Path:** ${groqUsed ? 'Groq' : ''} ${orUsed ? 'OpenRouter' : ''} ${(!groqUsed && !orUsed) ? 'Direct/Other' : ''}\n\n`;

            // Extract User Input
            const inboundNode = Object.keys(runData).find(k => k.toLowerCase().includes('inbound') || k.toLowerCase().includes('webhook'));
            if (inboundNode && runData[inboundNode][0]?.data?.main?.[0]?.[0]?.json) {
                const item = runData[inboundNode][0].data.main[0][0].json;
                report += `**USER:** ${item.body?.body || item.body || JSON.stringify(item)}\n\n`;
            }

            // Extract Errors
            Object.keys(runData).forEach(node => {
                if (runData[node][0]?.error) {
                    report += `> [!CAUTION]\n> **ERROR in ${node}:** ${runData[node][0].error.message}\n\n`;
                }
            });

            // Extract Bot Response
            const respNode = Object.keys(runData).find(k => k.toLowerCase().includes('responder') || k.toLowerCase().includes('outbound'));
            if (respNode && runData[respNode][0]?.data?.main?.[0]?.[0]?.json) {
                const item = runData[respNode][0].data.main[0][0].json;
                report += `**BOT:** ${item.response || item.body || JSON.stringify(item)}\n\n`;
            }
            
            report += "---\n\n";
        });

        fs.writeFileSync('log_analysis_v8.md', report);
        ssh.dispose();
    } catch (err) {
        fs.writeFileSync('log_analysis_v8.md', "FAILED: " + err.stack);
    }
})();
