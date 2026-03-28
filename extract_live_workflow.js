const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function checkWorkflow() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    const res = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';"`);
    fs.writeFileSync('current_live_nodes.json', res.stdout);
    console.log('Saved current_live_nodes.json. Length:', res.stdout.length);

    ssh.dispose();
}

checkWorkflow().catch(console.error);
