const { NodeSSH } = require('node-ssh');
const { createDecipheriv } = require('crypto');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        // Get the encrypted credentials
        const res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT name, type, data FROM credentials_entity WHERE name=\'Postgres account\';"');
        console.log('--- Credential Raw Data ---');
        console.log(res.stdout);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
})();
