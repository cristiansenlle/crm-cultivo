const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function createSidecar() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log('Deploying reliable telemetry sidecar...');

        const jsCode = `
const http = require('http');
const fetch = require('node-fetch');

const SUPABASE_URL = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/daily_telemetry";
const SUPABASE_ANON_KEY = "HIDDEN_SECRET_BY_AI";

const server = http.createServer((req, res) => {
    // Enable CORS for frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/telemetry') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const b = JSON.parse(body);
                const payload = { 
                    batch_id: b.batch_id, 
                    room_id: b.batch_id, 
                    temperature_c: Number(b.temp), 
                    humidity_percent: Number(b.humidity), 
                    vpd_kpa: Number(b.vpd),
                    created_at: b.timestamp || new Date().toISOString()
                };
                
                const supaRes = await fetch(SUPABASE_URL, {
                    method: 'POST',
                    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': \`Bearer \${SUPABASE_ANON_KEY}\`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
                    body: JSON.stringify(payload)
                });
                
                const text = await supaRes.text();
                res.writeHead(supaRes.status, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok', supa_status: supaRes.status, supa_response: text }));
            } catch (e) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: e.message }));
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(5679, () => {
    console.log('Telemetry Sidecar listening on port 5679');
});
`;

        fs.writeFileSync('temp_sidecar.js', jsCode);
        await ssh.putFile('temp_sidecar.js', '/opt/crm-cannabis/telemetry_sidecar.js');

        // Start sidecar with PM2
        await ssh.execCommand('pm2 start /opt/crm-cannabis/telemetry_sidecar.js --name "telemetry-sidecar" && pm2 save');

        // Switch frontend to use sidecar port (5679) instead of N8N (5678)
        await ssh.execCommand(`sed -i 's|http://109.199.99.126:5678/webhook/telemetry|http://109.199.99.126:5679/telemetry|g' /opt/crm-cannabis/main.js`);

        console.log('✅ Sidecar deployed and main.js redirected to port 5679.');

        ssh.dispose();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

createSidecar();
