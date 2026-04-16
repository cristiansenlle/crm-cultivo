const fetch = require('node-fetch');
const SUPABASE_URL = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/daily_telemetry";
const SUPABASE_ANON_KEY = "HIDDEN_SECRET_BY_AI";

fetch(SUPABASE_URL + '?id=gt.0', {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
})
    .then(res => {
        console.log('Delete status:', res.status);
        return res.text();
    })
    .then(text => console.log('Delete resp:', text))
    .catch(err => console.error(err));
