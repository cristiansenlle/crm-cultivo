const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('Fetching N8N execution file...');
    const res = await ssh.execCommand('cat -n /usr/lib/node_modules/n8n/node_modules/n8n-core/dist/execution-engine/node-execution-context/node-execution-context.js | grep -A 10 -B 10 " 136\\s"');
    console.log(res.stdout);

    // also check if any other file path exists
    const res2 = await ssh.execCommand('find /usr/lib/node_modules/n8n/ -name "node-execution-context.js"');
    console.log('Path found:', res2.stdout);

    ssh.dispose();
}
run();
