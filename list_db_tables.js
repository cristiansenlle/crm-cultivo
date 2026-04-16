const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
        
        const res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite ".tables"');
        console.log('--- Database Tables ---');
        console.log(res.stdout);

        ssh.dispose();
    } catch (err) {
        console.error('Table list failed:', err.message);
    }
})();
