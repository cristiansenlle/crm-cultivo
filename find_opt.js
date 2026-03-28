const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    const result2 = await ssh.execCommand('find /opt -name "bot-wa.js" -maxdepth 5');
    console.log('\\n--- FIND bot-wa.js in /opt ---');
    console.log(result2.stdout);

    ssh.dispose();
}
run();
