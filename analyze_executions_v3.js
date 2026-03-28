const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });

        const query = `
            SELECT e.id, d.data 
            FROM execution_entity e 
            JOIN execution_data d ON e.id = d.executionId 
            WHERE e.workflowId = 'scpZdPe5Cp4MG98G' 
            ORDER BY e.startedAt DESC LIMIT 3;
        `;
        
        const sqlPath = '/opt/crm-cannabis/query_exec_keys.sql';
        await ssh.execCommand(`echo "${query}" > ${sqlPath}`);
        const res = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite < ${sqlPath}`);
        
        const lines = res.stdout.split('\n');
        for (const line of lines) {
            const parts = line.split('|');
            if (parts.length < 2) continue;
            const id = parts[0];
            const dataStr = parts.slice(1).join('|');
            try {
                const data = JSON.parse(dataStr);
                const runData = data.resultData.runData;
                console.log(`\n=== EXECUTION ${id} NODES ===`);
                console.log(Object.keys(runData).join(', '));
                
                // For each node, let's see if it has a 'response' or 'body'
                for (const nodeName of Object.keys(runData)) {
                    const nodeRun = runData[nodeName][0];
                    if (nodeRun.data && nodeRun.data.main && nodeRun.data.main[0] && nodeRun.data.main[0][0]) {
                        const item = nodeRun.data.main[0][0].json;
                        if (nodeName.toLowerCase().includes('webhook')) console.log(`[${nodeName}] IN:`, item.body?.body || item.body);
                        if (nodeName.toLowerCase().includes('respond') || nodeName.toLowerCase().includes('echo') || nodeName.toLowerCase().includes('whatsapp')) {
                             console.log(`[${nodeName}] OUT:`, item.response || item.body || item);
                        }
                    }
                    if (nodeRun.error) {
                        console.log(`[${nodeName}] ERROR:`, nodeRun.error.message);
                    }
                }
            } catch (err) {}
        }

        ssh.dispose();
    } catch (err) {
        console.error('Analysis failed:', err.message);
    }
})();
