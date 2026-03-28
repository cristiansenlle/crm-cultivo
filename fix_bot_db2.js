require('dotenv').config();
const fs = require('fs');

const url = "https://opnjrzixsrizdnphbjnq.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8";

const headers = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
};

async function patchEvents() {
    console.log("Patching LOTE-21531CE0 -> Planta madre NP/2/2025");
    const r1 = await fetch(`${url}/rest/v1/core_agronomic_events?id=eq.3e4192b8-0d11-4ac7-b6b9-4d870e5571b8`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ batch_id: "Planta madre NP/2/2025" })
    });
    console.log(await r1.json());

    console.log("Patching LOTE-21531AE9 -> Planta Madre RHC/1/2026");
    const r2 = await fetch(`${url}/rest/v1/core_agronomic_events?id=eq.a39e9b3b-a9b8-415d-a3fe-53383e3cbe61`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ batch_id: "Planta Madre RHC/1/2026" })
    });
    console.log(await r2.json());

    console.log("Patching LOTE-21531CDE -> Planta Madre NP/1/2025");
    const r3 = await fetch(`${url}/rest/v1/core_agronomic_events?id=eq.fa25a4d0-4038-4088-9dd1-0288c36bde1e`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ batch_id: "Planta Madre NP/1/2025" })
    });
    console.log(await r3.json());
}

patchEvents().catch(console.error);
