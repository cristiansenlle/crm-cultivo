const fetch = require('node-fetch');
const SUPABASE_URL = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "HIDDEN_SECRET_BY_AI";

async function checkTodayEvents() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const res = await fetch(`${SUPABASE_URL}core_agronomic_events?select=*&date_occurred=gte.${today}`, {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
        });
        const data = await res.json();
        console.log(`Events today (${today}):`, data.length);
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error fetching today events:', err.message);
    }
}

today = new Date().toISOString().split('T')[0];
console.log('Today is:', today);
checkTodayEvents();
