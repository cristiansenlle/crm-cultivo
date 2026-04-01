const fs = require('fs');
const https = require('https');

const clientConfig = fs.readFileSync('c:\\Users\\Cristian\\.gemini\\antigravity\\crm cannabis\\supabase-client.js', 'utf8');
const SUPABASE_KEY = clientConfig.match(/const SUPABASE_ANON_KEY = "(.*?)"/)[1];

const req = https.request({
    hostname: 'opnjrzixsrizdnphbjnq.supabase.co',
    path: '/rest/v1/core_inventory_quimicos?name=eq.Alga%20a%20Mic',
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=representation' }
}, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('HTTP', res.statusCode);
        console.log('RESPONSE:', data);
    });
});
req.on('error', console.error);
req.end();
