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

    // Login with the correct field name
    await runCmd('Login to N8N',
        `curl -s -X POST http://109.199.99.126:5678/rest/login \
    -H 'Content-Type: application/json' \
    -d '{"emailOrLdapLoginId":"admin","password":"AdminSeguro123!"}' \
    -c /tmp/n8n_sess.txt`);

    // Try also with "email" field
    await runCmd('Login with email field',
        `curl -s -X POST http://109.199.99.126:5678/rest/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@admin.com","password":"AdminSeguro123!"}' \
    -c /tmp/n8n_sess2.txt`);

    // Get all workflows
    const wfResp = await runCmd('Get workflows',
        `curl -s http://109.199.99.126:5678/rest/workflows -b /tmp/n8n_sess.txt`);

    const wfResp2 = await runCmd('Get workflows sess2',
        `curl -s http://109.199.99.126:5678/rest/workflows -b /tmp/n8n_sess2.txt`);

    // Try activating using env-stored API key if any
    await runCmd('Check n8n env for API key',
        'pm2 show n8n-service | grep -i "api\\|key\\|env" | head -10');

    // Check if n8n has an API key configured
    await runCmd('N8N settings/env',
        'cat /etc/environment 2>/dev/null | grep -i n8n; cat ~/.bashrc 2>/dev/null | grep -i n8n; cat ~/.profile 2>/dev/null | grep -i n8n');

    // Final: check port 5678 is truly up
    await runCmd('Webhook test final',
        "curl -s -w '\\nHTTP: %{http_code}' -X POST http://109.199.99.126:5678/webhook/wa-inbound -H 'Content-Type: application/json' -d '{\"from\":\"test\",\"body\":\"hola\"}'");

    ssh.dispose();
}
run();
