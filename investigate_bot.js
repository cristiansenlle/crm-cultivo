const { NodeSSH } = require('node-ssh');
const path = require('path');
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
        if (r.stderr && r.stderr.trim()) console.log('ERR:', r.stderr.substring(0, 200));
        return r;
    };

    // Check the ACTUAL file content at line 90-100 on server  
    await runCmd('Server bot-wa.js lines 85-100', "sed -n '85,100p' /opt/crm-cannabis/bot-wa.js");
    await runCmd('Server bot-wa.js wc -l', "wc -l /opt/crm-cannabis/bot-wa.js");

    // Check what PM2 app 5 is actually pointing to
    await runCmd('PM2 app 5 details', "pm2 show 5 | grep -E 'script|cwd|exec_interpreter'");

    // Check all bot-wa.js files on server
    await runCmd('Find all bot-wa.js', "find / -name 'bot-wa.js' 2>/dev/null | grep -v node_modules");

    // Get the N8N API key using the REST API via cookies
    await runCmd('N8N API key via login',
        "curl -s -X POST http://109.199.99.126:5678/rest/login -H 'Content-Type: application/json' -d '{\"emailOrLdapLoginName\":\"admin@admin.com\",\"password\":\"AdminSeguro123!\"}' -c /tmp/n8n_cookies.txt | python3 -c \"import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('token','NO_TOKEN'))\" 2>/dev/null || echo 'login failed'");

    await runCmd('N8N Login with admin',
        "curl -s -X POST http://109.199.99.126:5678/rest/login -H 'Content-Type: application/json' -d '{\"emailOrLdapLoginName\":\"admin\",\"password\":\"AdminSeguro123!\"}' -c /tmp/n8n_cookies2.txt");

    await runCmd('Get workflows with cookie',
        "curl -s http://109.199.99.126:5678/rest/workflows -b /tmp/n8n_cookies2.txt | python3 -c \"import sys,json; d=json.load(sys.stdin); [print(f\\\"  {w['name']} | id={w['id']} | active={w['active']}\\\") for w in d.get('data',[])]\" 2>/dev/null");

    ssh.dispose();
}
run();
