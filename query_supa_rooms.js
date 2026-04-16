require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkSupa() {
    let html = fs.readFileSync('supabase-client.js', 'utf8');
    let urlMatch = html.match(/createClient\(['"]([^'"]+)['"]/);
    let keyMatch = html.match(/createClient\([^,]+,\s*['"]([^'"]+)['"]/);
    
    if (urlMatch && keyMatch) {
         const supabase = createClient(urlMatch[1], keyMatch[1]);
         console.log("Fetching core_batches...");
         const { data, error } = await supabase.from('core_batches').select('*').limit(5);
         
         console.log("core_batches:", data);
         
         // Try to find if there is a rooms table
         console.log("Trying to fetch core_rooms...");
         const roomsRes = await supabase.from('core_rooms').select('*').limit(5);
         console.log("core_rooms:", roomsRes.data, "Error:", roomsRes.error);
         
         const salasRes = await supabase.from('core_salas').select('*').limit(5);
         console.log("core_salas:", salasRes.data, "Error:", salasRes.error);
    } else {
         console.log("Could not parse supabase credentials from supabase-client.js");
    }
}

checkSupa();
