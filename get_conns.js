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

        const res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT connections FROM workflow_entity WHERE id=\'scpZdPe5Cp4MG98G\';"');
        fs.writeFileSync('c:\\Users\\Cristian\\.gemini\\antigravity\\crm cannabis\\connections.json', res.stdout);
        console.log('Connections downloaded');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
})();
