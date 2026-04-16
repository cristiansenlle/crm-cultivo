const fetch = require('node-fetch');

const SUPABASE_URL = "https://opnjrzixsrizdnphbjnq.supabase.co";
const SUPABASE_ANON_KEY = "HIDDEN_SECRET_BY_AI";

async function getBatches() {
    const url = `${SUPABASE_URL}/rest/v1/core_batches`;
    console.log('Fetching active batches...');

    try {
        const res = await fetch(url, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));

    } catch (e) {
        console.error('Fetch error:', e);
    }
}

getBatches();
