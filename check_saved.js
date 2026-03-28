const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function checkSaved() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('Fetching live workflow...');
    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id = \'scpZdPe5Cp4MG98G\';"');

    // Check if the hallucinated mock lotes still exist
    const matches = res.stdout.match(/LOTE-[^"]+/g);
    console.log('Mentions of LOTE-something:', matches);

    // Check if 11111111 exists
    const ones = res.stdout.match(/11111111/g);
    console.log('Mentions of 11111111:', ones);

    // Save it
    fs.writeFileSync('THE_NEWEST_live_nodes_patched.json', res.stdout);
    ssh.dispose();
}

checkSaved().catch(console.error);
