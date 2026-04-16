const fetch = require('node-fetch');
const SUPABASE_URL = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "HIDDEN_SECRET_BY_AI";

async function checkTables() {
    const tables = ['core_rooms', 'core_batches', 'daily_telemetry', 'core_events'];
    for (const table of tables) {
        try {
            const res = await fetch(`${SUPABASE_URL}${table}?select=count`, {
                headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
            });
            const data = await res.json();
            console.log(`Table ${table}: ${JSON.stringify(data)}`);
        } catch (err) {
            console.log(`Table ${table}: ERROR - ${err.message}`);
        }
    }
}

checkTables();
