const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function findDbs() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('--- Finding all database.sqlite files (fast) ---');
    let res = await ssh.execCommand('find / -name "database.sqlite" -not -path "*/node_modules/*" 2>/dev/null');
    console.log(res.stdout);

    ssh.dispose();
}

findDbs().catch(console.error);
