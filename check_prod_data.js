const { NodeSSH } = require('node-ssh');
const https = require('https');

// Check what tables and data are in production Supabase
const SUPABASE_URL = 'opnjrzixsrizdnphbjnq.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8';

// First get a token via login
function request(path, method, body, token) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: SUPABASE_URL,
            port: 443,
            path,
            method,
            headers: {
                'Content-Type': 'application/json',
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${token || ANON_KEY}`,
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
    // Login first to get a token
    const loginRes = await request('/auth/v1/token?grant_type=password', 'POST', {
        email: 'cristiansenlle@gmail.com',
        password: 'Fn@calderon6193'
    });
    const loginData = JSON.parse(loginRes.body);
    const token = loginData.access_token;
    console.log('Login:', loginRes.status === 200 ? '✅ OK' : '❌ FAILED');

    // Query lotes table
    const lotesRes = await request('/rest/v1/lotes?select=*', 'GET', null, token);
    console.log('\n=== LOTES ===');
    console.log(lotesRes.body);

    // Query cultivos table  
    const cultivosRes = await request('/rest/v1/cultivos?select=*', 'GET', null, token);
    console.log('\n=== CULTIVOS ===');
    console.log(cultivosRes.body);
}
run();
