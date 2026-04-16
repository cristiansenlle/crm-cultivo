async function run() {
    const sbUrl = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/";
    const sbKey = "HIDDEN_SECRET_BY_AI";
    
    try {
        const rowRes = await fetch(sbUrl + 'core_bot_logs?select=*&order=created_at.desc&limit=5', { headers: { 'apikey': sbKey, 'Authorization': 'Bearer ' + sbKey }});
        const logs = await rowRes.json();
        
        console.log("=== Bot Logs (Last 5) ===");
        console.log(JSON.stringify(logs, null, 2));
        
    } catch(e) {
        console.error("Error fetching", e);
    }
}
run();
