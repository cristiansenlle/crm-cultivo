const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
    let dbRes = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, name FROM workflow_entity;"');
    let realId = '';
    let lines = dbRes.stdout.split('\n');
    for(let l of lines) {
        if(l.includes('DB Deploy 4')) realId = l.split('|')[0];
    }
    console.log('REAL ID:', realId);
    if(realId) {
        await ssh.execCommand('pm2 stop n8n-service');
        let x = await ssh.execCommand('n8n execute --id=' + realId);
        console.log(x.stdout);
        console.log("ERR", x.stderr);
        await ssh.execCommand('pm2 start n8n-service');
        await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "DELETE FROM workflow_entity WHERE name LIKE \'DB Deploy%\';"');
    }
    ssh.dispose();
}
run().catch(console.error);
