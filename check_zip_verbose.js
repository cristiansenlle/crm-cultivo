const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    const result = await ssh.execCommand('unzip -l /root/crm_cannabis_backup_20260303_184235.zip | head -n 20');
    console.log('\\n--- ZIP CONTENT ON SERVER ---');
    console.log(result.stdout);
    console.log(result.stderr);

    ssh.dispose();
}
run();
