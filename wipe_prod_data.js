const https = require('https');

const SUPABASE_URL = 'opnjrzixsrizdnphbjnq.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8';

function request(path, method, body, token) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: SUPABASE_URL, port: 443, path, method,
            headers: {
                'Content-Type': 'application/json',
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${token || ANON_KEY}`,
                'Prefer': 'return=minimal',
                ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
            }
        };
        const req = https.request(opts, (res) => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve({ status: res.statusCode, body: d }));
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function run() {
    const loginRes = await request('/auth/v1/token?grant_type=password', 'POST', {
        email: 'cristiansenlle@gmail.com', password: 'Fn@calderon6193'
    });
    const token = JSON.parse(loginRes.body).access_token;
    console.log('Login OK. Wiping all tables...\n');

    // All tables to wipe - using id != '' to match all rows with any ID value
    // For tables where id might not exist, we use timestamp
    const tables = [
        'core_batches',
        'core_telemetry',
        'inventario',
        'ventas',
        'clientes',
        'tareas',
        'salas',
        'eventos_agronomicos',
        'cosechas',
        'lotes',
        'pos_ventas',
        'pos_items',
        'insumos',
        'cultivos'
    ];

    for (const table of tables) {
        // Delete all records - use id=gte.0 for UUID tables or timestamp as fallback
        const res = await request(`/rest/v1/${table}?id=gte.00000000-0000-0000-0000-000000000000`, 'DELETE', null, token);
        if (res.status === 204 || res.status === 200) {
            console.log(`✅ ${table} wiped`);
        } else if (res.status === 404 || res.body.includes('does not exist')) {
            // Table doesn't exist, skip
        } else {
            // Try with timestamp column override
            const res2 = await request(`/rest/v1/${table}?timestamp=gte.2000-01-01`, 'DELETE', null, token);
            if (res2.status === 204 || res2.status === 200) {
                console.log(`✅ ${table} wiped (by timestamp)`);
            } else {
                console.log(`⚠️  ${table}: ${res.status} ${res.body.substring(0, 80)}`);
            }
        }
    }

    console.log('\nVerifying core_batches is empty:');
    const check = await request('/rest/v1/core_batches?select=id', 'GET', null, token);
    console.log('core_batches rows:', check.body);
}
run();
