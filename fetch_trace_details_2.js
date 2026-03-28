const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function getTraceDetails2() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        const res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT data FROM execution_data ORDER BY executionId DESC LIMIT 1;"');

        if (res.stdout) {
            const rowStr = res.stdout;
            // SQLite might return the raw JSON
            try {
                const trace = JSON.parse(rowStr);

                console.log("Top-level keys:", Object.keys(trace));
                if (trace.data) {
                    console.log("Trace.data keys:", Object.keys(trace.data));
                    if (trace.data.resultData) {
                        console.log("trace.data.resultData keys:", Object.keys(trace.data.resultData));
                        if (trace.data.resultData.runData) {
                            console.log("Nodes executed:", Object.keys(trace.data.resultData.runData).join(" -> "));
                            const lastNode = Object.keys(trace.data.resultData.runData).pop();
                            console.log("Last node output for " + lastNode + ":", JSON.stringify(trace.data.resultData.runData[lastNode], null, 2).substring(0, 1000));
                        }
                    }
                }
            } catch (e) {
                console.log("Parse error:", e.message);
                console.log("Start text:", rowStr.substring(0, 200));
            }
        }
        ssh.dispose();
    } catch (e) {
        console.error(e);
        ssh.dispose();
    }
}
getTraceDetails2();
