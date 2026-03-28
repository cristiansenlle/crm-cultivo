const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://opnjrzixsrizdnphbjnq.supabase.co';
// From previous tasks we know the anon key or generic service key is in supabase-client.js
// Let's just read it from c:/Users/Cristian/.gemini/antigravity/crm cannabis/supabase-client.js
const fs = require('fs');
let code = fs.readFileSync('c:/Users/Cristian/.gemini/antigravity/crm cannabis/supabase-client.js', 'utf8');
const matchKey = code.match(/const supabaseKey = '(.*?)';/);
if (matchKey && matchKey[1]) {
    const sb = createClient(supabaseUrl, matchKey[1]);
    sb.from('core_rooms').select('*').then(res => {
        console.log(JSON.stringify(res, null, 2));
    }).catch(console.error);
} else {
    console.log("Could not find key");
}
