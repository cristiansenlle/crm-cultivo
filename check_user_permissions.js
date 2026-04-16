const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkAndFixPermissions() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'HIDDEN_SECRET_BY_AI' 
        });

        console.log('--- Checking Users ---');
        const usersRes = await ssh.execCommand('sqlite3 -json /root/.n8n/database.sqlite "SELECT id, email FROM user;"');
        console.log('Users:', usersRes.stdout);

        console.log('--- Checking Workflow Ownership ---');
        const wfRes = await ssh.execCommand('sqlite3 -json /root/.n8n/database.sqlite "SELECT id, name, userId FROM workflow_entity WHERE id = \'scpZdPe5Cp4MG98G\';"');
        console.log('Workflow:', wfRes.stdout);

        const users = JSON.parse(usersRes.stdout || '[]');
        const targetUser = users.find(u => u.email === 'cristiansenlle@gmail.com');
        
        if (targetUser) {
            console.log(`Target User ID for ${targetUser.email} is ${targetUser.id}`);
            console.log('--- Reassigning Workflow Ownership ---');
            await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "UPDATE workflow_entity SET userId = '${targetUser.id}' WHERE id = 'scpZdPe5Cp4MG98G';"`);
            console.log('Ownership updated.');
        } else {
            console.log('User cristiansenlle@gmail.com not found in database!');
        }

        console.log('--- Restarting n8n ---');
        await ssh.execCommand('pm2 restart n8n-service');
        console.log('Service restarted.');

        ssh.dispose();
    } catch (err) {
        console.error('Check failed:', err.message);
    }
}

checkAndFixPermissions();
