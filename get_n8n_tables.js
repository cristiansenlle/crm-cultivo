const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    const runCmd = async (label, cmd) => {
        console.log(`\n▶️ ${label}`);
        const r = await ssh.execCommand(cmd);
        if (r.stdout) console.log(r.stdout);
        if (r.stderr && r.stderr.trim()) console.log('ERR:', r.stderr.substring(0, 300));
    };

    await runCmd('List Tables', 'sqlite3 /root/.n8n/database.sqlite ".tables"');
    await runCmd('Get Users', 'sqlite3 /root/.n8n/database.sqlite "SELECT * FROM \\"user\\";" 2>/dev/null || sqlite3 /root/.n8n/database.sqlite "SELECT * FROM user;"');

    ssh.dispose();
}
run();
