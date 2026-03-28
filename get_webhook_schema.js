const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
        
        const res = await ssh.execCommand('sqlite3 -json /root/.n8n/database.sqlite "PRAGMA table_info(webhook_entity);"');
        console.log('--- webhook_entity Table Info ---');
        console.log(res.stdout);

        ssh.dispose();
    } catch (err) {
        console.error('Table info failed:', err.message);
    }
})();
