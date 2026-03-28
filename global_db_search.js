const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
        
        console.log('Searching for SQLite databases...');
        const res = await ssh.execCommand('find / -name "*.sqlite" 2>/dev/null');
        console.log('--- Found Databases ---');
        console.log(res.stdout || 'No databases found.');

        ssh.dispose();
    } catch (err) {
        console.error('Search failed:', err.message);
    }
})();
