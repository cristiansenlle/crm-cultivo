const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkPs() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('--- ps aux | grep n8n ---');
    let res = await ssh.execCommand('ps aux | grep n8n');
    console.log(res.stdout);

    console.log('\n--- Where is N8N config? ---');
    let res2 = await ssh.execCommand('find / -name "database.sqlite" 2>/dev/null');
    console.log(res2.stdout);

    ssh.dispose();
}

checkPs().catch(console.error);
