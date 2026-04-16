const fs = require('fs');
const https = require('https');

const SUPABASE_URL = 'opnjrzixsrizdnphbjnq.supabase.co';
const clientConfig = fs.readFileSync('c:/Users/Cristian/.gemini/antigravity/crm cannabis/supabase-client.js', 'utf8');
const keyMatch = clientConfig.match(/const SUPABASE_ANON_KEY = "(.*?)"/);
const SUPABASE_KEY = keyMatch ? keyMatch[1] : '';

if(!SUPABASE_KEY) { console.log('NO KEY'); process.exit(1); }

const options = {
    hostname: SUPABASE_URL,
    path: '/rest/v1/core_agronomic_events?order=id.desc&limit=5',
    method: 'GET',
    headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
    }
};

const req = https.request(options, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('Latest Events:', JSON.stringify(JSON.parse(data), null, 2)));
});
req.on('error', e => console.error(e));
req.end();
