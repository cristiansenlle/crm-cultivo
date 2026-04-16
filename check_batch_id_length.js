const axios = require('axios');

const SUPABASE_RPC_URL = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/rpc/get_table_schema";
const SUPABASE_ANON_KEY = "HIDDEN_SECRET_BY_AI";

async function checkSchema() {
    console.log('Fetching schema for daily_telemetry...');
    try {
        // If RPC doesn't exist, we'll try a different way. 
        // Usually we can query information_schema if enabled, but let's try a direct query to a non-existent column to get the error/schema info if possible
        // or just a select and check types if the client has metadata.
        
        // Actually, let's try to query the information_schema via REST if allowed
        const response = await axios.get("https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/daily_telemetry?limit=0", {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Prefer': 'count=exact'
            }
        });
        console.log('Table found. Testing batch_id length by inserting a long string...');
        
        const longId = "COMPLETELY_LONG_ID_THAT_SHOULD_NOT_BE_TRUNCATED_IF_TEXT";
        const testData = {
            batch_id: longId,
            temperature_c: 0,
            humidity_percent: 0,
            created_at: new Date().toISOString()
        };

        const insertRes = await axios.post("https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/daily_telemetry", testData, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        });
        console.log('Insert result:', insertRes.data[0].batch_id === longId ? 'NOT TRUNCATED' : 'TRUNCATED TO: ' + insertRes.data[0].batch_id);

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

checkSchema();
