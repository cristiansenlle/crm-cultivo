const fetch = require('node-fetch');

const SUPABASE_URL = "https://opnjrzixsrizdnphbjnq.supabase.co";
const SUPABASE_ANON_KEY = "HIDDEN_SECRET_BY_AI";

async function createBatchesCorrectly() {
    const url = `${SUPABASE_URL}/rest/v1/core_batches`;

    // The foreign key requires the batch_id in daily_telemetry
    // to match the 'id' in core_batches.
    const batches = [
        { id: 'fc9d96c3-1811-47cb-b003-81b498f3b0ab', strain: 'OG Kush', start_date: '2026-03-01', stage: 'Vegetativo', location: 'Sala 1' },
        { id: '22222222-2222-2222-2222-222222222222', strain: 'Sour Diesel', start_date: '2026-02-15', stage: 'Floración', location: 'Sala 2' },
        { id: '33333333-3333-3333-3333-333333333333', strain: 'Blue Dream', start_date: '2026-01-10', stage: 'Secado', location: 'Sala 3' }
    ];

    console.log('Inserting 3 foundational batches into Supabase...');

    for (const b of batches) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(b)
            });
            console.log(b.location, 'id:', b.id, '->', res.status);
            if (res.status !== 201) console.log(await res.text());
        } catch (e) {
            console.error('Error inserting:', e);
        }
    }
}

createBatchesCorrectly();
