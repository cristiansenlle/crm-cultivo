const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkErrors() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod' 
        });

        const query = "SELECT id, status, data, startedAt FROM execution_entity WHERE workflowId = 'scpZdPe5Cp4MG98G' ORDER BY startedAt DESC LIMIT 3";
        const res = await ssh.execCommand(`sqlite3 -json /root/.n8n/database.sqlite "${query}"`);
        
        console.log('--- EXECUTION DATA START ---');
        console.log(res.stdout);
        console.log('--- EXECUTION DATA END ---');
        
        ssh.dispose();
    } catch (err) {
        console.error('Check errors failed:', err.message);
    }
}

checkErrors();
