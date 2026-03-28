const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });

        const query = "SELECT e.id, d.data FROM execution_entity e JOIN execution_data d ON e.id = d.executionId WHERE e.workflowId = 'scpZdPe5Cp4MG98G' AND e.status = 'success' ORDER BY e.startedAt DESC LIMIT 5;";
        const localPath = './fetch_names_eval.sql';
        fs.writeFileSync(localPath, query);
        
        const remotePath = '/opt/crm-cannabis/fetch_names_eval.sql';
        await ssh.putFile(localPath, remotePath);
        
        const res = await ssh.execCommand(`sqlite3 -json /root/.n8n/database.sqlite < ${remotePath}`);
        
        if (!res.stdout) {
             console.log("No successful executions found.");
             ssh.dispose();
             return;
        }

        const rawData = JSON.parse(res.stdout);

        rawData.forEach(row => {
            const arr = JSON.parse(row.data);
            const cache = new Map();
            
            function deref(val, depth = 0) {
                if (depth > 15) return "...";
                if (typeof val === 'string' && /^\d+$/.test(val)) {
                    const idx = parseInt(val);
                    if (cache.has(idx)) return cache.get(idx);
                    if (arr[idx] !== undefined) {
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

            const resultData = deref(arr[0].resultData);
            const decodedRunData = resultData.runData;

            console.log(`\n=== [ID ${row.id}] DIALOGUE ===`);

            for (const nodeName in decodedRunData) {
                const nodeRun = decodedRunData[nodeName][0];
                const items = nodeRun.data?.main?.[0];
                if (items) {
                    items.forEach(item => {
                        const json = item.json;
                        if (nodeName.toLowerCase().includes('webhook')) console.log(`USER: ${json.body?.body || json.body}`);
                        if (nodeName.toLowerCase().includes('respond') || nodeName.toLowerCase().includes('whatsapp') || nodeName.toLowerCase().includes('echo')) {
                             console.log(`BOT: ${json.response || json.body}`);
                        }
                    });
                }
            }
            console.log('---');
        });

        ssh.dispose();
        fs.unlinkSync(localPath);
    } catch (err) {
        console.error('Eval failed:', err.message);
    }
})();
