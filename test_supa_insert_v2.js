const fetch = require('node-fetch');

const SUPABASE_URL = "https://opnjrzixsrizdnphbjnq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8";

async function testSupabaseInsertV2() {
    const url = `${SUPABASE_URL}/rest/v1/daily_telemetry`;
    console.log('Sending corrected raw POST request to:', url);

    // We now know 'fc9d96c3-1811-47cb-b003-81b498f3b0ab' actually exists in core_batches
    const payload = {
        batch_id: 'fc9d96c3-1811-47cb-b003-81b498f3b0ab',
        room_id: 'fc9d96c3-1811-47cb-b003-81b498f3b0ab',
        temperature_c: 26.5,
        humidity_percent: 55.0,
        vpd_kpa: 1.1,
        created_at: new Date().toISOString()
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

testSupabaseInsertV2();
