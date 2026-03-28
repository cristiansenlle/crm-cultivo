const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function getTraceDetails3() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        const res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT data FROM execution_data ORDER BY executionId DESC LIMIT 1;"');

        if (res.stdout) {
            try {
                // Parse the SQLite output
                let rawData = JSON.parse(res.stdout);

                // If it's an array of bytes, stringify it
                let jsonStr;
                if (Array.isArray(rawData)) {
                    jsonStr = Buffer.from(rawData).toString('utf8');
                } else if (typeof rawData === 'string') {
                    jsonStr = rawData;
                } else {
                    jsonStr = JSON.stringify(rawData);
                }

                const trace = JSON.parse(jsonStr);

                if (trace.resultData && trace.resultData.runData) {
                    const executedNodes = Object.keys(trace.resultData.runData);
                    console.log("NODES EXECUTED:", executedNodes.join(" -> "));

                    const lastNode = executedNodes[executedNodes.length - 1];
                    console.log("\nOutput of last node:", lastNode);
                    const lastData = trace.resultData.runData[lastNode];
                    console.log(JSON.stringify(lastData).substring(0, 1000));
                } else {
                    console.log("Keys in trace:", Object.keys(trace));
                }
            } catch (e) {
                console.log("Error:", e.message);
            }
        }
        ssh.dispose();
    } catch (e) {
        console.error(e);
        ssh.dispose();
    }
}
getTraceDetails3();
