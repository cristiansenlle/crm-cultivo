const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        // 1. List workflows
        const wfRes = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, name FROM workflow_entity;"');
        console.log('--- WORKFLOWS ---');
        console.log(wfRes.stdout);

        // 2. Check execution_data table (if exists) or structure
        const tableRes = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite ".tables"');
        console.log('--- TABLES ---');
        console.log(tableRes.stdout);

        // 3. Simple count of executions per workflow
        const countRes = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT workflowId, count(*) FROM execution_entity GROUP BY workflowId;"');
        console.log('--- EXECUTION COUNTS ---');
        console.log(countRes.stdout);

        ssh.dispose();
    } catch (err) {
        console.error('Check failed:', err.message);
    }
})();
