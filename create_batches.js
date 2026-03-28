const fetch = require('node-fetch');

const SUPABASE_URL = "https://opnjrzixsrizdnphbjnq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8";

async function createBatches() {
    const url = `${SUPABASE_URL}/rest/v1/core_batches`;

    const batches = [
        { id: '11111111-1111-1111-1111-111111111111', batch_id: 'Sala 1 - Vegetativo', strain: 'OG Kush', start_date: '2026-03-01', current_stage: 'Vegetativo' },
        { id: '22222222-2222-2222-2222-222222222222', batch_id: 'Sala 2 - Floración', strain: 'Sour Diesel', start_date: '2026-02-15', current_stage: 'Floración' },
        { id: '33333333-3333-3333-3333-333333333333', batch_id: 'Sala 3 - Secado', strain: 'Blue Dream', start_date: '2026-01-10', current_stage: 'Secado' }
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
            console.log(b.batch_id, '->', res.status);
            if (res.status !== 201) console.log(await res.text());
        } catch (e) {
            console.error('Error inserting:', e);
        }
    }
}

createBatches();
