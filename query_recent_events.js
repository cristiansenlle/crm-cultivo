const SUPABASE_URL = "https://opnjrzixsrizdnphbjnq.supabase.co";
const SUPABASE_ANON_KEY = "HIDDEN_SECRET_BY_AI";

async function run() {
    const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
    };

    console.log("=== core_agronomic_events (LATEST 5) ===");
    let r1 = await fetch(`${SUPABASE_URL}/rest/v1/core_agronomic_events?order=date_occurred.desc&limit=5`, { headers });
    console.log(await r1.json());

    console.log("\n=== core_tasks (LATEST 5) ===");
    let r2 = await fetch(`${SUPABASE_URL}/rest/v1/core_tasks?order=created_at.desc&limit=5`, { headers });
    let tasks = await r2.json();
    if(tasks.error) console.log(tasks); else console.log(tasks.map(t => ({id: t.id, title: t.title, created_at: t.created_at})));

    console.log("\n=== core_protocols (LATEST 5) ===");
    let r3 = await fetch(`${SUPABASE_URL}/rest/v1/core_protocols?order=created_at.desc&limit=5`, { headers });
    let protocols = await r3.json();
    if(protocols.error) console.log(protocols); else console.log(protocols.map(p => ({id: p.id, title: p.title, created_at: p.created_at})));
}

run();
