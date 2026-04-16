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
        if (r.stderr && r.stderr.trim()) console.log('ERR:', r.stderr.substring(0, 300));
        return r;
    };

    // STEP 1: Kill ALL Chrome-related processes completely
    console.log('\n🔥 STEP 1: Killing ALL Chrome and Chromium processes...');
    await runCmd('Kill ALL chrome/chromium', 'kill -9 $(pgrep -f "chrome\\|chromium") 2>/dev/null || true; sleep 1; kill -9 $(pgrep -f "chrome\\|chromium") 2>/dev/null || true');
    await runCmd('Check no chrome running', 'pgrep -f chrome || echo "No chrome processes found ✅"');

    // STEP 2: Delete the entire wwebjs session folder to force re-auth (but keep backup)
    // The SingletonLock is inside the Default profile, not just the root
    console.log('\n🔥 STEP 2: Removing Puppeteer session lock files...');
    await runCmd('List session dir', 'ls /opt/crm-cannabis/.wwebjs_auth/ 2>/dev/null || echo "No session dir"');
    await runCmd('Remove all lock files recursively', 'find /opt/crm-cannabis/.wwebjs_auth -name "SingletonLock" -o -name "SingletonCookie" -o -name "*.lock" | xargs rm -f 2>/dev/null; echo "Locks removed"');
    await runCmd('Show remaining session files', 'ls /opt/crm-cannabis/.wwebjs_auth/session/ 2>/dev/null | head -20 || echo "empty"');

    // STEP 3: Activate the N8N workflow using correct API endpoint (v1)
    console.log('\n🔥 STEP 3: Activating N8N workflow via API...');
    // First get all workflows with the correct credentials
    const listWf = await runCmd('Get workflow list',
        `curl -s -u 'admin:AdminSeguro123!' http://109.199.99.126:5678/api/v1/workflows 2>/dev/null`);

    // Parse and try to activate each CRM workflow
    try {
        const wfData = JSON.parse(listWf.stdout || '{}');
        const workflows = wfData.data || [];
        console.log(`Found ${workflows.length} workflows`);
        for (const wf of workflows) {
            console.log(`  - "${wf.name}" | active=${wf.active} | id=${wf.id}`);
            if (!wf.active) {
                await runCmd(`Activating: ${wf.name}`,
                    `curl -s -u 'admin:AdminSeguro123!' -X PATCH http://109.199.99.126:5678/api/v1/workflows/${wf.id} -H 'Content-Type: application/json' -d '{"active":true}'`);
            }
        }
    } catch (e) {
        console.log('Could not parse workflows, trying manual activation...');
        // Try to activate directly via N8N UI API (different endpoint)
        await runCmd('Try V1 token auth',
            `curl -s -X POST http://109.199.99.126:5678/rest/login -H 'Content-Type: application/json' -d '{"emailOrLdapLoginName":"admin","password":"AdminSeguro123!"}' -c /tmp/n8n_cookies.txt`);
        await runCmd('Get workflows with cookie',
            `curl -s http://109.199.99.126:5678/rest/workflows -b /tmp/n8n_cookies.txt | python3 -c "import sys,json; d=json.load(sys.stdin); [print(w['name'],w['id'],w['active']) for w in d.get('data',[])]" 2>/dev/null || echo 'failed'`);
    }

    // STEP 4: Stop bot, wait, restart cleanly
    console.log('\n🔥 STEP 4: Restarting bot cleanly...');
    await runCmd('Stop bot', 'pm2 stop whatsapp-bot');
    await runCmd('Wait 5s', 'sleep 5');
    await runCmd('Check NO chrome now', 'pgrep -f chrome | wc -l || echo "0"');
    await runCmd('Start bot', 'pm2 start whatsapp-bot');
    await runCmd('Wait 10s for init', 'sleep 10');

    const botLogs = await runCmd('Bot logs', 'pm2 logs whatsapp-bot --lines 20 --nostream');

    // STEP 5: Test webhook
    await runCmd('Test N8N webhook',
        "curl -s -w '\\nHTTP: %{http_code}' -X POST http://109.199.99.126:5678/webhook/wa-inbound -H 'Content-Type: application/json' -d '{\"from\":\"test\",\"body\":\"hola\"}'");

    await runCmd('Final PM2 status', 'pm2 list');

    ssh.dispose();
}
run();
