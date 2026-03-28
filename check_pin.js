const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkPinData() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('--- Checking pinData for the workflow ---');
    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT pinData FROM workflow_entity WHERE id = \'scpZdPe5Cp4MG98G\';"');

    const pinStr = res.stdout.trim();
    if (!pinStr) {
        console.log('pinData is EMPTY or NULL.');
    } else {
        console.log('pinData LENGTH:', pinStr.length);
        console.log('pinData snippet:', pinStr.substring(0, 1000));
        if (pinStr.includes('LOTE-A')) {
            console.log('BINGO! LOTE-A is pinned!');
        }
    }

    ssh.dispose();
}

checkPinData().catch(console.error);
