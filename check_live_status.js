const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    const runCmd = async (label, cmd) => {
        console.log(`\n▶️ ${label}`);
        const r = await ssh.execCommand(cmd);
        if (r.stdout) console.log(r.stdout);
        if (r.stderr && r.stderr.trim()) console.log('ERR:', r.stderr.substring(0, 200));
        return r;
    };

    // Check CURRENT bot logs (not historical)
    await runCmd('Current bot status', 'pm2 show 5 | grep -E "status|restarts|uptime|pid"');
    await runCmd('RECENT bot error logs only', 'pm2 logs 5 --lines 10 --nostream --err');
    await runCmd('RECENT bot out logs', 'pm2 logs 5 --lines 10 --nostream --out');

    // Activate n8n workflow via cookie-based REST API
    const loginResult = await runCmd('Login to N8N',
        "curl -v -s -X POST http://109.199.99.126:5678/rest/login -H 'Content-Type: application/json' -d '{\"emailOrLdapLoginName\":\"admin\",\"password\":\"AdminSeguro123!\"}' -c /tmp/cook.txt 2>&1 | tail -20");

    await runCmd('Get N8N workflows',
        "curl -s http://109.199.99.126:5678/rest/workflows -b /tmp/cook.txt");

    // Also try generating an API key
    await runCmd('Create N8N API key',
        "curl -s -X POST http://109.199.99.126:5678/rest/users/api-key -H 'Content-Type: application/json' -b /tmp/cook.txt");

    // Test if bot actually connects to WhatsApp (check for qr or connected message)
    await runCmd('Is bot connected to WA?', 'pm2 logs 5 --lines 30 --nostream | grep -E "QR|conectado|ready|Waiting|Esperando|Error|ERRO"');

    ssh.dispose();
}
run();
