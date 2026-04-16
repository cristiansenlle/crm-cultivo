const fs = require('fs');
const path = require('path');
const https = require('https');

const clientConfig = fs.readFileSync(path.join(__dirname, 'supabase-client.js'), 'utf8');
const SUPABASE_KEY = clientConfig.match(/const SUPABASE_ANON_KEY = "(.*?)"/)[1];
const SUPABASE_URL = 'opnjrzixsrizdnphbjnq.supabase.co';

const req = https.request({
    hostname: SUPABASE_URL,
    path: '/rest/v1/core_inventory_quimicos?select=*',
    method: 'GET',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
}, res => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
        console.log('RAW SUPABASE INVENTORY DUMP:');
        console.log(data);
    });
});
req.end();
