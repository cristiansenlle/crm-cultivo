const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lttvjmdjntdxtpmsyjgy.supabase.co';
let supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supaKey) {
    try {
        const envContent = fs.readFileSync('next-app/.env.local', 'utf-8');
        const match = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
        if (match) supaKey = match[1].trim();
    } catch(e) {}
}

const supabase = createClient(supaUrl, supaKey);

async function run() {
    console.log("Fetching core_agronomic_events and core_bot_logs (last hour)...");
    
    const { data: logs, error: errLogs } = await supabase
        .from('core_bot_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
        
    console.log("---- LAST BOT LOGS ----");
    if(logs) console.log(logs.map(l => ({id: l.id, status: l.status, payload: l.payload})));
    else console.log(errLogs);
}

run();
