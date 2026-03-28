// Updates the telemetry sidecar on port 5680 to handle the new room_id/batch_id correctly
// Also checks the N8N WhatsApp bot workflow for which Supabase project it uses
const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

const SUPABASE_URL = "https://opnjrzixsrizdnphbjnq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8";

const newSidecarCode = `
const http = require('http');
const https = require('https');

const SUPABASE_URL = "${SUPABASE_URL}";
const SUPABASE_ANON_KEY = "${SUPABASE_ANON_KEY}";

function supabaseInsert(payload) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify([{
            batch_id: payload.batch_id,
            room_id: payload.room_id || payload.batch_id,
            temperature_c: payload.temp,
            humidity_percent: payload.humidity,
            vpd_kpa: payload.vpd || null
        }]);
        const url = new URL(SUPABASE_URL + '/rest/v1/daily_telemetry');
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
                'Content-Length': Buffer.byteLength(body)
            }
        };
        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/telemetry') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const payload = JSON.parse(body);
                console.log('[Sidecar5680] Received:', JSON.stringify(payload));

                if (!payload.batch_id) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing batch_id' }));
                    return;
                }

                const result = await supabaseInsert(payload);
                console.log('[Sidecar5680] Supabase response:', result.status, result.body);

                if (result.status >= 200 && result.status < 300) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true, supabase_status: result.status }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Supabase error', status: result.status, details: result.body }));
                }
            } catch (err) {
                console.error('[Sidecar5680] Error:', err.message);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
        return;
    }

    res.writeHead(404);
    res.end('Not found');
});

server.listen(5680, '0.0.0.0', () => {
    console.log('[Sidecar5680] Telemetry sidecar listening on port 5680');
});
`;

async function updateSidecar() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    // Write new sidecar code
    fs.writeFileSync('/tmp/telemetry_sidecar_new.js', newSidecarCode);
    await ssh.putFile('/tmp/telemetry_sidecar_new.js', '/opt/crm-cannabis/telemetry_sidecar.js');
    console.log('✅ Sidecar code updated on server');

    // Restart sidecar
    await ssh.execCommand('pm2 restart telemetry-sidecar');
    console.log('✅ Sidecar restarted');

    // Check PM2 status
    const pm2Status = await ssh.execCommand('pm2 list --no-color');
    console.log('PM2 status:', pm2Status.stdout.substring(0, 1000));

    // Now investigate the bot workflow nodes for Supabase references
    // Read all nodes from the workflow to check which Supabase project the bot uses
    await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';" > /root/bot_nodes_full.json`);
    await ssh.getFile('c:\\Users\\Cristian\\.gemini\\antigravity\\crm cannabis\\bot_nodes_full.json', '/root/bot_nodes_full.json');

    ssh.dispose();
    console.log('\n✅ Done. Bot workflow nodes saved to bot_nodes_full.json');
}

updateSidecar().catch(console.error);
