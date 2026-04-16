const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkStr() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    let r = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id = \'scpZdPe5Cp4MG98G\';"');
    console.log(r.stdout.includes('11111111'));

    let w = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_published_version WHERE workflowId = \'scpZdPe5Cp4MG98G\';"');
    console.log(w.stdout.includes('11111111'));

    ssh.dispose();
}

checkStr().catch(console.error);
