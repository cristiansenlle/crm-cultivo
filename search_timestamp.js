const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        // Search for 1800000000 in the nodes and connections
        const res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, name FROM workflow_entity WHERE nodes LIKE \'%1800000000%\' OR connections LIKE \'%1800000000%\';"');
        console.log('--- Search for 1800000000 ---');
        console.log(res.stdout || 'Not found in database');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
})();
