const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
        
        async function getLast(db) {
            const r = await ssh.execCommand(`sqlite3 -json ${db} "SELECT id, startedAt FROM execution_entity ORDER BY startedAt DESC LIMIT 1;"`);
            return r.stdout || 'No data';
        }

        console.log('--- Database Comparison ---');
        console.log('Nested DB (/root/.n8n/.n8n/database.sqlite):', await getLast('/root/.n8n/.n8n/database.sqlite'));
        console.log('Standard DB (/root/.n8n/database.sqlite):', await getLast('/root/.n8n/database.sqlite'));

        ssh.dispose();
    } catch (err) {
        console.error('Comparison failed:', err.message);
    }
})();
