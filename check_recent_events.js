const fetch = require('node-fetch');
const SUPABASE_URL = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "HIDDEN_SECRET_BY_AI";

async function checkRecentEvents() {
    try {
        const res = await fetch(`${SUPABASE_URL}core_agronomic_events?select=*&order=date_occurred.desc&limit=5`, {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
        });
        const data = await res.json();
        console.log('Recent Agronomic Events:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error fetching events:', err.message);
    }
}

checkRecentEvents();
