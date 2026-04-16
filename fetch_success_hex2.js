const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function getSuccessHex2() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT hex(data) FROM execution_data WHERE executionId=69;"');

        if (res.stdout) {
            const hexString = res.stdout.trim();
            const buffer = Buffer.from(hexString, 'hex');
            const utf8 = buffer.toString('utf8');

            try {
                const trace = JSON.parse(utf8);
                if (trace.resultData && trace.resultData.runData) {
                    const executedNodes = Object.keys(trace.resultData.runData);
                    console.log("EXEC 69 NODES:", executedNodes.join(" -> "));
                }

                // Let's also check execution 68
                const res68 = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT hex(data) FROM execution_data WHERE executionId=68;"');
                if (res68.stdout) {
                    const t68 = JSON.parse(Buffer.from(res68.stdout.trim(), 'hex').toString('utf8'));
                    console.log("EXEC 68 NODES:", Object.keys(t68.resultData.runData).join(" -> "));
                }
            } catch (e) {
                console.log("Parse failed.", e.message);
            }
        }
        ssh.dispose();
    } catch (e) {
        console.error(e);
        ssh.dispose();
    }
}
getSuccessHex2();
