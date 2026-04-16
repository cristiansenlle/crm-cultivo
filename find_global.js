const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    const result = await ssh.execCommand('find / -name "bot-wa.js" 2>/dev/null');
    console.log('\\n--- FIND GLOBAL ---');
    console.log(result.stdout);

    ssh.dispose();
}
run();
