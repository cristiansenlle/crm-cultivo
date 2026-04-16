const fetch = require('node-fetch');
const SUPABASE_URL = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "HIDDEN_SECRET_BY_AI";

async function checkTables() {
    const tables = [
        'core_rooms', 
        'core_batches', 
        'daily_telemetry', 
        'core_agronomic_events', 
        'core_inventory_quimicos', 
        'core_inventory_cosechas',
        'core_sales',
        'core_inventory_sales'
    ];
    for (const table of tables) {
        try {
            const res = await fetch(`${SUPABASE_URL}${table}?select=count`, {
                headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
            });
            const data = await res.json();
            if (data.code) {
                console.log(`Table ${table}: FAIL - ${data.message}`);
            } else {
                console.log(`Table ${table}: SUCCESS - ${JSON.stringify(data)}`);
            }
        } catch (err) {
            console.log(`Table ${table}: ERROR - ${err.message}`);
        }
    }
}

checkTables();
