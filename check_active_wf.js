const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
        const res = await ssh.execCommand("sqlite3 -json /root/.n8n/database.sqlite \"SELECT workflowId, startedAt FROM execution_entity ORDER BY startedAt DESC LIMIT 1;\"");
        console.log(res.stdout);
        ssh.dispose();
    } catch (err) {
        console.error(err);
    }
})();
