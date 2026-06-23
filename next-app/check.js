const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkData() {
    console.log("Fetching last 5 telemetry records...");
    
    // El nombre del sensor o mac que usa el mqtt logger: shellyhtg3-d0cf13c2f578
    // Let's just get the last 5 records of ANY sensor to see the newest globally
    console.log("Fetching all table names...");
    const { data, error } = await supabase
        .from('daily_telemetry')
        .select('*')
        .eq('sensor_id', '41e5bdbb-a191-4e4a-8ec9-db40692c9f1f')
        .order('created_at', { ascending: false })
        .limit(5);

    if(error) {
        // Fallback or just print
        console.error("Error querying Supabase:", error);
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}

checkData();
