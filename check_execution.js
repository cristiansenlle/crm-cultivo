const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const query = `SELECT JSON_EXTRACT(data, '$.resultData.error') as error_msg FROM execution_entity WHERE workflowId='scpZdPe5Cp4MG98G' AND status='failed' ORDER BY startTime DESC LIMIT 1;`;
        const res = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "${query}"`);
        
        console.log('--- LAST FAILED EXECUTION ERROR ---');
        console.log(res.stdout || 'No failed executions found or error extracting message.');
        
        if (!res.stdout) {
            // Try fetching the whole data column if JSON_EXTRACT fails or returns nothing
            const resData = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "SELECT data FROM execution_entity WHERE workflowId='scpZdPe5Cp4MG98G' AND status='failed' ORDER BY startTime DESC LIMIT 1;"`);
            console.log('--- FULL EXECUTION DATA (TRUNCATED) ---');
            console.log(resData.stdout.substring(0, 1000));
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
})();
