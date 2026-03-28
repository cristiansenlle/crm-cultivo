const fetch = require('node-fetch');
const SUPABASE_URL = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8";

async function checkSpecificLots() {
    const searchTerms = ['Planta Madre NP/1/2025', 'Planta madre NP/2/2025', 'Planta Madre RHC/1/2026'];
    for (const term of searchTerms) {
        try {
            // Using ilike for fuzzy matching similar to what the agent might do
            const res = await fetch(`${SUPABASE_URL}core_batches?id=ilike.*${term.replace(/\//g, '%2F')}*`, {
                headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
            });
            let data = await res.json();
            
            // If ID match fails, search in search metadata or similar if applicable, 
            // but usually id is the primary key and the agent maps names to it.
            // Let's also check by a generic name if there is one.
            if (data.length === 0) {
                 const res2 = await fetch(`${SUPABASE_URL}core_batches?select=*`, {
                    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
                });
                const allLots = await res2.json();
                console.log(`Searching for "${term}" in all lots...`);
                const found = allLots.filter(l => JSON.stringify(l).toLowerCase().includes(term.toLowerCase()));
                console.log(`Found ${found.length} matches for "${term}"`);
                if (found.length > 0) console.log(JSON.stringify(found, null, 2));
            } else {
                console.log(`Matches for "${term}" by ID:`, JSON.stringify(data, null, 2));
            }
        } catch (err) {
            console.log(`Error searching for "${term}": ${err.message}`);
        }
    }
}

checkSpecificLots();
