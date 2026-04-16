const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const workflowId = 'scpZdPe5Cp4MG98G';
        const query = `SELECT id FROM execution_entity WHERE workflowId = '${workflowId}' ORDER BY startedAt DESC LIMIT 10;`;
        const res = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "${query}"`);
        
        const ids = res.stdout.split('\n').filter(id => id.trim());

        for (const id of ids) {
            const dataRes = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "SELECT data FROM execution_entity WHERE id = '${id}';"`);
            try {
                const data = JSON.parse(dataRes.stdout);
                const runData = data.resultData.runData;
                
                // Find Input (usually from Webhook node or 'WhatsApp Inbound')
                let userInput = "N/A";
                const webhookNode = Object.keys(runData).find(k => k.toLowerCase().includes('webhook') || k.toLowerCase().includes('inbound'));
                if (webhookNode && runData[webhookNode][0] && runData[webhookNode][0].data && runData[webhookNode][0].data.main[0] && runData[webhookNode][0].data.main[0][0]) {
                    const item = runData[webhookNode][0].data.main[0][0].json;
                    userInput = item.body ? (item.body.body || item.body) : "N/A";
                }

                // Find Output (usually the last node or a specific 'Respond' node)
                let botOutput = "N/A";
                const responseNode = Object.keys(runData).find(k => k.toLowerCase().includes('responder') || k.toLowerCase().includes('outbound') || k.toLowerCase().includes('echo'));
                if (responseNode && runData[responseNode][0] && runData[responseNode][0].data && runData[responseNode][0].data.main[0] && runData[responseNode][0].data.main[0][0]) {
                     const item = runData[responseNode][0].data.main[0][0].json;
                     botOutput = item.response || item.body || JSON.stringify(item);
                }

                // Find AI Errors
                let aiError = "None";
                const aiNode = Object.keys(runData).find(k => k.toLowerCase().includes('agent'));
                if (aiNode && runData[aiNode][0] && runData[aiNode][0].error) {
                    aiError = runData[aiNode][0].error.message;
                }

                console.log(`[ID ${id}] USER: ${userInput}`);
                console.log(`[ID ${id}] BOT: ${botOutput}`);
                if (aiError !== "None") console.log(`[ID ${id}] ERROR: ${aiError}`);
                console.log('---');
            } catch (pErr) {
               // console.log('Parse error for', id);
            }
        }

        ssh.dispose();
    } catch (err) {
        console.error('Fetch failed:', err.message);
    }
})();
