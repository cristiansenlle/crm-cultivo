const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkStatic() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('--- Checking staticData for the workflow ---');
    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT staticData FROM workflow_entity WHERE id = \'scpZdPe5Cp4MG98G\';"');

    const datStr = res.stdout.trim();
    if (!datStr) {
        console.log('staticData is EMPTY or NULL.');
    } else {
        console.log('staticData LENGTH:', datStr.length);
        console.log('staticData snippet:', datStr.substring(0, 500));
        if (datStr.includes('11111111')) {
            console.log('BINGO! 11111111 is in static properties!');
        }
    }

    ssh.dispose();
}

checkStatic().catch(console.error);
