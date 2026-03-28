const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function getTraceDetails() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        const res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT data FROM execution_data ORDER BY executionId DESC LIMIT 1;"');

        if (res.stdout) {
            const trace = JSON.parse(res.stdout);

            console.log("Trace resultData keys:", Object.keys(trace.resultData || {}));
            if (trace.resultData && trace.resultData.runData) {
                const executedNodes = Object.keys(trace.resultData.runData);
                console.log("NODES EXECUTED:", executedNodes.join(" -> "));

                // Print the output of the last node
                const lastNodeName = executedNodes[executedNodes.length - 1];
                const lastNodeData = trace.resultData.runData[lastNodeName];
                console.log(`\nOutput of last node (${lastNodeName}):`);
                console.log(JSON.stringify(lastNodeData, null, 2).substring(0, 500));
            }

        }
        ssh.dispose();
    } catch (e) {
        console.error(e);
        ssh.dispose();
    }
}
getTraceDetails();
