const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function getExecutionTrace() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT data FROM execution_data ORDER BY executionId DESC LIMIT 1;"');

        if (res.stdout) {
            try {
                const trace = JSON.parse(res.stdout);
                console.log("Trace parsed successfully.");
                if (trace.resultData && trace.resultData.error) {
                    console.log("EXECUTION ERROR MESSAGE:");
                    console.log(JSON.stringify(trace.resultData.error, null, 2));

                    if (trace.resultData.lastNodeExecuted) {
                        console.log("LAST NODE EXECUTED:", trace.resultData.lastNodeExecuted);
                    }
                } else {
                    console.log("No error block found in resultData.");
                }
            } catch (e) {
                console.log("Failed to parse JSON.");
            }
        } else {
            console.log("No data returned by query.");
            console.log("Stderr:", res.stderr);
        }
        ssh.dispose();
    } catch (e) {
        console.error(e);
        ssh.dispose();
    }
}
getExecutionTrace();
