const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function getHex() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT hex(data) FROM execution_data ORDER BY executionId DESC LIMIT 1;"');

        if (res.stdout) {
            const hexString = res.stdout.trim();
            const buffer = Buffer.from(hexString, 'hex');
            const utf8 = buffer.toString('utf8');

            try {
                const trace = JSON.parse(utf8);
                if (trace.resultData && trace.resultData.runData) {
                    const executedNodes = Object.keys(trace.resultData.runData);
                    console.log("NODES EXECUTED:", executedNodes.join(" -> "));

                    const lastNode = executedNodes[executedNodes.length - 1];
                    console.log("\nLast Node (" + lastNode + ") Output:");
                    const lastData = trace.resultData.runData[lastNode];

                    // The actual output data is usually in lastData[0].data.main[0]
                    if (lastData && lastData.length > 0 && lastData[lastData.length - 1].data) {
                        console.log(JSON.stringify(lastData[lastData.length - 1].data, null, 2).substring(0, 1000));

                        if (lastData[lastData.length - 1].error) {
                            console.log("\nERROR BLOCK:");
                            console.log(JSON.stringify(lastData[lastData.length - 1].error, null, 2));
                        }
                    } else {
                        console.log("lastData structure:", JSON.stringify(lastData).substring(0, 500));
                    }
                }
            } catch (e) {
                console.log("Parse failed on decoded string.");
                console.log(utf8.substring(0, 200));
            }
        }
        ssh.dispose();
    } catch (e) {
        console.error(e);
        ssh.dispose();
    }
}
getHex();
