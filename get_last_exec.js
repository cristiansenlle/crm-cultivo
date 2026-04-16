const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

(async () => {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        // Get the latest failed execution
        const res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, status, data, workflowData FROM execution_entity ORDER BY stoppedAt DESC LIMIT 1;"');
        const output = res.stdout;
        
        fs.writeFileSync('c:\\Users\\Cristian\\.gemini\\antigravity\\crm cannabis\\last_execution.json', output);
        console.log('Last execution downloaded');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
})();
