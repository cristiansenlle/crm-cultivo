const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });

        const query = "SELECT e.id, e.startedAt, d.data FROM execution_entity e JOIN execution_data d ON e.id = d.executionId WHERE e.workflowId = 'scpZdPe5Cp4MG98G' ORDER BY e.startedAt DESC LIMIT 15;";
        const localPath = './fetch_final.sql';
        fs.writeFileSync(localPath, query);
        
        await ssh.putFile(localPath, '/opt/crm-cannabis/fetch_final.sql');
        const res = await ssh.execCommand(`sqlite3 -json /root/.n8n/database.sqlite < /opt/crm-cannabis/fetch_final.sql`);
        
        if (!res.stdout) {
             console.log("No interactions found.");
             ssh.dispose();
             return;
        }

        const rawData = JSON.parse(res.stdout);
        let logText = "# Bot Dialogue Evidence\n\n";

        rawData.forEach(row => {
            const arr = JSON.parse(row.data);
            
            function deref(val, depth = 0) {
                if (depth > 20) return "...";
                if (typeof val === 'string' && /^\d+$/.test(val)) {
                    const idx = parseInt(val);
                    if (arr[idx] !== undefined) return deref(arr[idx], depth + 1);
                }
                if (Array.isArray(val)) return val.map(v => deref(v, depth + 1));
                if (val && typeof val === 'object') {
                    const obj = {};
                    for (const k in val) obj[k] = deref(val[k], depth + 1);
                    return obj;
                }
                return val;
            }

            const resultData = deref(arr[0].resultData);
            const runData = resultData.runData;

            let userMsg = null;
            let botMsg = null;

            // Extract User Msg
            const inNode = runData["Webhook WhatsApp"] || runData["Webhook Entities"];
            if (inNode) {
                const item = inNode[0].data?.main?.[0]?.[0]?.json;
                userMsg = item?.body?.body || item?.body?.text || item?.text;
            }

            // Extract Bot Msg
            const outNode = runData["Format WA Response"] || runData["Format WA Response (Groq)"];
            if (outNode) {
                const item = outNode[0].data?.main?.[0]?.[0]?.json;
                botMsg = item?.response || item?.body;
            }

            if (userMsg || botMsg) {
                logText += `### Interaction ${row.id} (${row.startedAt})\n`;
                logText += `**USER:** ${userMsg || "_N/A_"}\n`;
                logText += `**BOT:** ${botMsg || "_N/A_"}\n\n`;
            }
        });

        fs.writeFileSync('final_evidence.md', logText);
        console.log("Evidence collected.");
        ssh.dispose();
    } catch (err) {
        console.error('Fetch failed:', err.message);
    }
})();
