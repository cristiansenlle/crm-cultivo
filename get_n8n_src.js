const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('Fetching N8N execution file...');
    const res = await ssh.execCommand('cat -n /usr/lib/node_modules/n8n/node_modules/n8n-core/src/execution-engine/node-execution-context/node-execution-context.ts | grep -A 10 -B 10 " 136\\s"');
    console.log(res.stdout);
    ssh.dispose();
}
run();
