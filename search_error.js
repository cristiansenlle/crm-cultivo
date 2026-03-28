const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        const res = await ssh.execCommand('grep -r "No suitable key" /root/.n8n || echo "Not found in files"');
        console.log('--- Search Results ---');
        console.log(res.stdout);
        
        // Also check if it's in the database records
        const resDb = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, executionData FROM execution_entity WHERE executionData LIKE \'%No suitable key%\' LIMIT 1;"');
        console.log('--- DB Results ---');
        console.log(resDb.stdout);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
})();
