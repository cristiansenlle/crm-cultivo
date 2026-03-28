const fs = require('fs');

const content = fs.readFileSync('C:\\Users\\Cristian\\.gemini\\antigravity\\crm cannabis\\supabase-client.js', 'utf8');
const urlMatch = content.match(/const SUPABASE_URL = "(.*?)"/);
const keyMatch = content.match(/const SUPABASE_ANON_KEY = "(.*?)"/);

fetch(urlMatch[1] + '/rest/v1/core_agronomic_events?select=*&limit=1', {
    headers: {
        apikey: keyMatch[1],
        Authorization: 'Bearer ' + keyMatch[1]
    }
})
    .then(res => res.json())
    .then(data => console.log(JSON.stringify(data[0])))
    .catch(err => console.error(err));
