const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });

        const sql = "SELECT data FROM execution_data WHERE executionId = 219;";
        const localPath = './get_219.sql';
        fs.writeFileSync(localPath, sql);
        
        await ssh.putFile(localPath, '/opt/crm-cannabis/get_219.sql');
        const res = await ssh.execCommand(`sqlite3 -json /root/.n8n/database.sqlite < /opt/crm-cannabis/get_219.sql`);
        
        if (!res.stdout) {
            console.log("No data for ID 219.");
            ssh.dispose();
            return;
        }

        const raw = JSON.parse(res.stdout);
        const arr = JSON.parse(raw[0].data);
        
        function deref(val, depth = 0) {
            if (depth > 15) return "...";
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

        const root = arr[0];
        const resultData = deref(root.resultData);
        const runData = resultData.runData;

        console.log("=== DIALOGUE ID 219 ===");
        for (const node in runData) {
            const items = runData[node][0]?.data?.main?.[0];
            if (items) {
                items.forEach(it => {
                    const json = it.json;
                    if (node.toLowerCase().includes('webhook')) console.log("USER:", json.body?.body || json.body);
                    if (node.toLowerCase().includes('respond') || node.toLowerCase().includes('whatsapp')) console.log("BOT:", json.response || json.body);
                });
            }
        }

        ssh.dispose();
    } catch (err) {
        console.error('Fetch failed:', err.message);
    }
})();
