
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
                    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
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
