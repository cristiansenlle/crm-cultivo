const axios = require('axios');

const SUPABASE_URL = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8";

async function backfill() {
    console.log('Fetching batches and missing telemetry...');
    try {
        // 1. Get batches mapping
        const { data: batches } = await axios.get(`${SUPABASE_URL}/core_batches?select=id,location`, {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
        });
        const batchToRoom = {};
        batches.forEach(b => batchToRoom[b.id] = b.location);

        // 2. Get telemetry with missing room_id
        const { data: telemetry } = await axios.get(`${SUPABASE_URL}/daily_telemetry?room_id=is.null&batch_id=not.is.null`, {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
        });

        console.log(`Found ${telemetry.length} records to update.`);

        for (const t of telemetry) {
            let roomId = null;
            let resolvedBatchId = t.batch_id;

            // Try to find if batch_id is a known batch ID or a known Room ID (location)
            const exactBatch = batches.find(b => b.id === t.batch_id);
            const exactRoom = batches.find(b => b.location === t.batch_id);
            
            if (exactBatch) {
                roomId = exactBatch.location;
            } else if (exactRoom) {
                roomId = exactRoom.location;
            } else {
                // Fuzzy match
                const fuzzyBatch = batches.find(b => b.id.startsWith(t.batch_id));
                const fuzzyRoom = batches.find(b => b.location.startsWith(t.batch_id));
                
                if (fuzzyBatch) {
                    resolvedBatchId = fuzzyBatch.id;
                    roomId = fuzzyBatch.location;
                } else if (fuzzyRoom) {
                    roomId = fuzzyRoom.location;
                    // If batch_id was actually a partial room id, we keep it or update it
                    resolvedBatchId = t.batch_id; 
                }
            }

            if (roomId || resolvedBatchId !== t.batch_id) {
                console.log(`Updating record ${t.id}: room_id=${roomId}, batch_id=${resolvedBatchId}`);
                await axios.patch(`${SUPABASE_URL}/daily_telemetry?id=eq.${t.id}`, { 
                    room_id: roomId,
                    batch_id: resolvedBatchId
                }, {
                    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' }
                });
            }
        }
        console.log('Backfill complete.');
    } catch (e) {
        console.error('Error:', e.response ? e.response.data : e.message);
    }
}

backfill();
