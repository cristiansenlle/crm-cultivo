const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkExecutions() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT COUNT(*) FROM execution_entity;"');
        console.log("Total executions in DB:", res.stdout);

        const res2 = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, startedAt, stoppedAt, status FROM execution_entity ORDER BY startedAt DESC LIMIT 5;"');
        console.log("Last 5 executions:\n", res2.stdout);

        ssh.dispose();
    } catch (e) {
        console.error(e);
        ssh.dispose();
    }
}
checkExecutions();
