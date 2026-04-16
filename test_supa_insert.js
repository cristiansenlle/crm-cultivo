const fetch = require('node-fetch');

const SUPABASE_URL = "https://opnjrzixsrizdnphbjnq.supabase.co";
const SUPABASE_ANON_KEY = "HIDDEN_SECRET_BY_AI";

async function testSupabaseInsert() {
    const url = `${SUPABASE_URL}/rest/v1/daily_telemetry`;
    console.log('Sending raw POST request to:', url);

    const payload = {
        batch_id: 'fc9d96c3-1811-47cb-b003-81b498f3b0ab',
        room_id: 'fc9d96c3-1811-47cb-b003-81b498f3b0ab',
        temperature_c: 25.0,
        humidity_percent: 60.0,
        vpd_kpa: 1.2
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(payload)
        });

        console.log('HTTP Status:', res.status);
        const text = await res.text();
        console.log('Response Body:', text);

    } catch (e) {
        console.error('Fetch error:', e);
    }
}

testSupabaseInsert();
