const { NodeSSH } = require('node-ssh');
const https = require('https');
const ssh = new NodeSSH();

function apiReq(path, method, body, auth) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: '109.199.99.126', port: 5678, path, method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from('admin:AdminSeguro123!').toString('base64'),
                ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
            }
        };
        const req = https.request(opts, (res) => {
            let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, body: d }));
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

function httpReq(path, method, body) {
    return new Promise((resolve, reject) => {
        const http = require('http');
        const data = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: '109.199.99.126', port: 5678, path, method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from('admin:AdminSeguro123!').toString('base64'),
                ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
            }
        };
        const req = http.request(opts, (res) => {
            let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, body: d }));
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

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
    };

    // === FIX 1: Kill stale Chrome/Chromium processes and the old lock file ===
    console.log('\n🔧 FIX 1: Limpiando procesos de Chrome colgados...');
    await runCmd('Killing chrome', 'pkill -f chrome || pkill -f chromium || true');
    await runCmd('Remove lock file', 'rm -f /opt/crm-cannabis/.wwebjs_auth/session/SingletonLock /opt/crm-cannabis/.wwebjs_auth/session/SingletonCookie 2>/dev/null || true');
    await runCmd('Remove all puppeteer locks', "find /opt/crm-cannabis/.wwebjs_auth -name 'SingletonLock' -delete 2>/dev/null; find /opt/crm-cannabis/.wwebjs_auth -name '*.lock' -delete 2>/dev/null; echo done");

    // === FIX 2: Activate N8N workflow via API ===
    console.log('\n🔧 FIX 2: Activando workflows en N8N...');
    const wfRes = await httpReq('/api/v1/workflows?limit=20', 'GET');
    console.log('Workflows response status:', wfRes.status);

    let workflows = [];
    try {
        const parsed = JSON.parse(wfRes.body);
        workflows = parsed.data || [];
        console.log(`Found ${workflows.length} total workflows`);
    } catch (e) {
        console.log('Could not parse workflows:', wfRes.body.substring(0, 200));
    }

    for (const wf of workflows) {
        console.log(`  Workflow: "${wf.name}" | active=${wf.active} | id=${wf.id}`);
        if (!wf.active && (wf.name.toLowerCase().includes('crm') || wf.name.toLowerCase().includes('cannabis') || wf.name.toLowerCase().includes('wa'))) {
            console.log(`  → Activating "${wf.name}"...`);
            const activateRes = await httpReq(`/api/v1/workflows/${wf.id}/activate`, 'POST');
            console.log(`  → Result: ${activateRes.status} ${activateRes.body.substring(0, 100)}`);
        }
    }

    // === FIX 3: Restart bot cleanly ===
    console.log('\n🔧 FIX 3: Reiniciando bot...');
    await runCmd('Stop bot', 'pm2 stop whatsapp-bot');
    await runCmd('Wait 3s', 'sleep 3');
    await runCmd('Start bot', 'pm2 start whatsapp-bot');
    await runCmd('Wait 5s for init', 'sleep 5');
    await runCmd('Bot status', 'pm2 show whatsapp-bot | grep -E "status|restarts|uptime|pid"');
    await runCmd('Bot recent logs', 'pm2 logs whatsapp-bot --lines 15 --nostream');

    // === Final check: Test webhook ===
    console.log('\n🔧 Testing webhook...');
    await runCmd('Test webhook', "curl -s -o /dev/null -w 'HTTP Code: %{http_code}' -X POST http://109.199.99.126:5678/webhook/wa-inbound -H 'Content-Type: application/json' -d '{\"test\":true}'");

    ssh.dispose();
}
run();
