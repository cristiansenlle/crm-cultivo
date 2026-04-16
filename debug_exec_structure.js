const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });

        const sql = "SELECT data FROM execution_data WHERE executionId = 226 LIMIT 1;";
        const localPath = './get_last_raw.sql';
        fs.writeFileSync(localPath, sql);
        
        await ssh.putFile(localPath, '/opt/crm-cannabis/get_last_raw.sql');
        const res = await ssh.execCommand(`sqlite3 -json /root/.n8n/database.sqlite < /opt/crm-cannabis/get_last_raw.sql`);
        
        if (!res.stdout) {
            console.log("No data for ID 226.");
            ssh.dispose();
            return;
        }

        const raw = JSON.parse(res.stdout);
        const arr = JSON.parse(raw[0].data);
        
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
        // Print node names to see what we have
        console.log("Node names found:", Object.keys(resultData.runData || {}));
        
        // Print a bit of logic for 'Webhook WhatsApp' and 'Format WA Response'
        const webhookNode = "Webhook WhatsApp";
        const responseNode = "Format WA Response";
        
        if (resultData.runData[webhookNode]) {
            console.log("\n--- Webhook WhatsApp Data ---");
            console.log(JSON.stringify(resultData.runData[webhookNode][0].data, null, 2));
        }

        if (resultData.runData[responseNode]) {
            console.log("\n--- Format WA Response Data ---");
            console.log(JSON.stringify(resultData.runData[responseNode][0].data, null, 2));
        }

        ssh.dispose();
    } catch (err) {
        console.error('Fetch failed:', err.message);
    }
})();
