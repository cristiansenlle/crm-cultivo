const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });

        // 1. Check schemas
        console.log('--- SCHEMAS ---');
        const sch1 = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite \".schema execution_entity\"');
        console.log(sch1.stdout);
        const sch2 = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite \".schema execution_data\"');
        console.log(sch2.stdout);

        // 2. Fetch last 5 execution IDs and their data
        // Joining execution_entity and execution_data
        const query = `
            SELECT e.id, e.startedAt, d.data 
            FROM execution_entity e 
            LEFT JOIN execution_data d ON e.id = d.executionId 
            WHERE e.workflowId = 'scpZdPe5Cp4MG98G' 
            ORDER BY e.startedAt DESC LIMIT 5;
        `;
        
        // Use file-based query to avoid PowerShell shell issues
        const sqlPath = '/opt/crm-cannabis/query_execs.sql';
        await ssh.execCommand(`echo "${query}" > ${sqlPath}`);
        const res = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite < ${sqlPath}`);
        
        const lines = res.stdout.split('\n');
        for (const line of lines) {
            const parts = line.split('|');
            if (parts.length < 3) continue;
            const id = parts[0];
            const dataStr = parts.slice(2).join('|'); // The data might contain pipes
            try {
                const data = JSON.parse(dataStr);
                console.log(`\n=== EXECUTION ${id} (${parts[1]}) ===`);
                // n8n data structure: resultData.runData
                const runData = data.resultData.runData;
                
                // Find user input
                const inNodes = Object.keys(runData).filter(k => k.toLowerCase().includes('webhook') || k.toLowerCase().includes('inbound'));
                inNodes.forEach(node => {
                    const firstItem = runData[node][0]?.data?.main?.[0]?.[0]?.json;
                    if (firstItem) console.log('USER:', firstItem.body?.body || firstItem.body || firstItem);
                });

                // Find bot output
                const outNodes = Object.keys(runData).filter(k => k.toLowerCase().includes('responder') || k.toLowerCase().includes('outbound') || k.toLowerCase().includes('http request'));
                outNodes.forEach(node => {
                    const firstItem = runData[node][0]?.data?.main?.[0]?.[0]?.json;
                    if (firstItem) console.log('BOT (' + node + '):', firstItem.response || firstItem.body || firstItem);
                });

                // Find errors
                Object.keys(runData).forEach(node => {
                    if (runData[node][0]?.error) {
                        console.log('ERROR in ' + node + ':', runData[node][0].error.message);
                    }
                });
            } catch (err) {
                // console.log('Failed to parse ID ' + id);
            }
        }

        ssh.dispose();
    } catch (err) {
        console.error('Analysis failed:', err.message);
    }
})();
