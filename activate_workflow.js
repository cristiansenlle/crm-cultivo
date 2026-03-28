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
        return r;
    };

    await runCmd('n8n CLI help', 'n8n --help');
    await runCmd('n8n update workflow', 'n8n update:workflow --active=true --id=1 || n8n update:workflow --active=true --all');

    ssh.dispose();
}
run();
