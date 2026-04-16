const axios = require('axios');

const SUPABASE_ANON_KEY = "HIDDEN_SECRET_BY_AI";
const BASE_URL = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1";

async function auditTelemetryData() {
    try {
        console.log('--- Auditing daily_telemetry ---');
        const telResp = await axios.get(`${BASE_URL}/daily_telemetry?select=batch_id,room_id`, {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
        });
        
        const telRooms = new Set();
        const telBatches = new Set();
        telResp.data.forEach(t => {
            if (t.room_id) telRooms.add(t.room_id);
            if (t.batch_id) telBatches.add(t.batch_id);
        });
        
        console.log('Unique Rooms in daily_telemetry:', Array.from(telRooms));
        console.log('Unique Batches in daily_telemetry:', Array.from(telBatches));

        console.log('\n--- Auditing core_agronomic_events ---');
        const evResp = await axios.get(`${BASE_URL}/core_agronomic_events?select=batch_id,room_id`, {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
        });
        
        const evRooms = new Set();
        const evBatches = new Set();
        evResp.data.forEach(e => {
            if (e.room_id) evRooms.add(e.room_id);
            if (e.batch_id) evBatches.add(e.batch_id);
        });
        
        console.log('Unique Rooms in core_agronomic_events:', Array.from(evRooms));
        console.log('Unique Batches in core_agronomic_events:', Array.from(evBatches));
        
        console.log('\n--- Checking existing Lotes ---');
        const batchResp = await axios.get(`${BASE_URL}/core_batches?select=id,location`, {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
        });
        console.log('Valid Batches (from core_batches):', batchResp.data.map(b => `${b.id} (${b.location})`));

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

auditTelemetryData();
