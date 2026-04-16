const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

(async () => {
    let report = "# Bot Execution Detailed Analysis\n\n";
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });

        const query = "SELECT e.id, d.data FROM execution_entity e JOIN execution_data d ON e.id = d.executionId WHERE e.workflowId = 'scpZdPe5Cp4MG98G' ORDER BY e.startedAt DESC LIMIT 10;";
        const localPath = './fetch_full.sql';
        fs.writeFileSync(localPath, query);
        
        const remotePath = '/opt/crm-cannabis/fetch_full.sql';
        await ssh.putFile(localPath, remotePath);
        
        const res = await ssh.execCommand(`sqlite3 -json /root/.n8n/database.sqlite < ${remotePath}`);
        
        if (!res.stdout) {
             fs.writeFileSync('log_analysis.md', "No data found.");
             ssh.dispose();
             return;
        }

        const rawData = JSON.parse(res.stdout);

        rawData.forEach(row => {
            const arr = JSON.parse(row.data);
            
            // Helper to recursively dereference
            function deref(val) {
                if (typeof val === 'string' && /^\d+$/.test(val)) {
                    const idx = parseInt(val);
                    if (arr[idx] !== undefined) return deref(arr[idx]);
                }
                if (Array.isArray(val)) return val.map(deref);
                if (val && typeof val === 'object') {
                    const obj = {};
                    for (const k in val) obj[k] = deref(val[k]);
                    return obj;
                }
                return val;
            }

            const fullData = deref(arr[0]);
            // Now fullData should be a regular n8n execution object!
            
            report += `## [ID ${row.id}] Execution\n`;
            
            const runData = deref(arr[2]).runData; // index 2 in arr[0] refers to runData
            // Wait, according to the debug snippet arr[0] is {"version":1, "resultData":"2", ...}
            // Let's just find the decoded resultData
            const resultData = deref(arr[0].resultData);
            const decodedRunData = resultData.runData;

            // Search for dialogue
            for (const nodeName in decodedRunData) {
                const nodeRun = decodedRunData[nodeName][0];
                const items = nodeRun.data?.main?.[0];
                if (items) {
                    items.forEach(item => {
                        const json = item.json;
                        if (nodeName.toLowerCase().includes('webhook')) {
                            report += `**USER:** ${json.body?.body || json.body}\n\n`;
                        }
                        if (nodeName.toLowerCase().includes('respond') || nodeName.toLowerCase().includes('whatsapp') || nodeName.toLowerCase().includes('echo')) {
                             report += `**BOT (${nodeName}):** ${json.response || json.body}\n\n`;
                        }
                    });
                }
                if (nodeRun.error) {
                    report += `> [!WARNING]\n> **ERROR in ${nodeName}:** ${nodeRun.error.message}\n\n`;
                }
            }
            report += "---\n\n";
        });

        fs.writeFileSync('log_analysis.md', report);
        ssh.dispose();
    } catch (err) {
        fs.writeFileSync('log_analysis.md', "FAILED: " + err.stack);
    }
})();
