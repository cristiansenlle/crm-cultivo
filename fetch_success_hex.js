const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function getSuccessHex() {
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
                    const webhookData = trace.resultData.runData['Webhook WhatsApp'];
                    if (webhookData) {
                        console.log("SUCCESSFUL WEBHOOK PAYLOAD:");
                        console.log(JSON.stringify(webhookData[0].data.main[0], null, 2));
                    }
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
getSuccessHex();
