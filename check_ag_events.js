const fs = require('fs');
// Assuming supabaseKey is in supa_key.txt or hardcoded in existing files.
// Let's just use a hardcoded GET via pure native HTTPS
const https = require('https');

const SUPABASE_URL = 'opnjrzixsrizdnphbjnq.supabase.co';
// Need the key. Let's find it in local files, like supabase-client.js
const clientConfig = fs.readFileSync('c:/Users/Cristian/.gemini/antigravity/crm cannabis/supabase-client.js', 'utf8');
const keyMatch = clientConfig.match(/const supabaseKey = '(.*?)'/);
const SUPABASE_KEY = keyMatch ? keyMatch[1] : '';

if(!SUPABASE_KEY) { console.log('NO KEY'); process.exit(1); }

const options = {
    hostname: SUPABASE_URL,
    path: '/rest/v1/core_agronomic_events?order=created_at.desc&limit=5',
    method: 'GET',
    headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': \`Bearer \${SUPABASE_KEY}\`
    }
};

const req = https.request(options, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('Latest Events:', JSON.parse(data)));
});
req.on('error', e => console.error(e));
req.end();
