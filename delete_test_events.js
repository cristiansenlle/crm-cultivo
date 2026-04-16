const fs = require('fs');
const https = require('https');
const path = require('path');

const SUPABASE_URL = 'opnjrzixsrizdnphbjnq.supabase.co';
let SUPABASE_KEY = '';

try {
    const clientConfig = fs.readFileSync(path.join(__dirname, 'supabase-client.js'), 'utf8');
    const keyMatch = clientConfig.match(/const SUPABASE_ANON_KEY = "(.*?)"/);
    if (keyMatch) SUPABASE_KEY = keyMatch[1];
} catch (e) {
    console.error("Could not read auth key");
    process.exit(1);
}

function supaFetch(apiPath, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: SUPABASE_URL,
            path: '/rest/v1/' + apiPath,
            method: method,
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        };

        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 400) return reject(new Error(`Supabase Error ${res.statusCode}: ` + data));
                resolve(data ? JSON.parse(data) : null);
            });
        });

        req.on('error', e => reject(e));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    try {
        console.log("Fetching events...");
        const events = await supaFetch('core_agronomic_events?select=id,description,total_cost');
        
        console.log(`Found ${events.length} total events.`);
        
        const toDelete = events.filter(e => {
            const desc = (e.description || '').toLowerCase();
            return desc.includes('alga-a-mic') 
                || desc.includes('top crop veg') 
                || desc.includes('top veg 7ml') 
                || desc.includes('datos del lote actualizados');
        });
        
        console.log(`Identifying ${toDelete.length} synthetic test events to delete:`);
        for (const e of toDelete) {
            console.log(` - Cost: ${e.total_cost} | Desc: ${e.description.substring(0, 50)}...`);
            await supaFetch(`core_agronomic_events?id=eq.${e.id}`, 'DELETE');
        }
        
        console.log("Successfully purged secondary test events from database.");
    } catch (err) {
        console.error("Error:", err.message);
    }
}

run();
