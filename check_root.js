const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    const result = await ssh.execCommand('ls -la /root');
    console.log('--- /root ---');
    console.log(result.stdout);

    const result2 = await ssh.execCommand('find /root -name "bot-wa.js" -maxdepth 4');
    console.log('\n--- FIND bot-wa.js ---');
    console.log(result2.stdout);

    ssh.dispose();
}
run();
