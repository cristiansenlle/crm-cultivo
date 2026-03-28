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

    await runCmd('Setup Owner', `curl -s -X POST http://109.199.99.126:5678/rest/owner/setup -H 'Content-Type: application/json' -d '{"email":"admin@admin.com","password":"AdminSeguro123!","firstName":"Admin","lastName":"Admin"}'`);
    await runCmd('Login after setup', `curl -s -X POST http://109.199.99.126:5678/rest/login -H 'Content-Type: application/json' -d '{"email":"admin@admin.com","password":"AdminSeguro123!"}' -c /tmp/n8n_cookies.txt`);

    ssh.dispose();
}
run();
