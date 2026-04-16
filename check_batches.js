require('dotenv').config();
const fs = require('fs');

const url = "https://opnjrzixsrizdnphbjnq.supabase.co";
const key = "HIDDEN_SECRET_BY_AI";

async function checkBatches() {
    const fetchOpts = {
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`
        }
    };
    
    console.log("Fetching core_batches...");
    const batchesRes = await fetch(`${url}/rest/v1/core_batches?select=id,stage&limit=50`, fetchOpts);
    if (batchesRes.ok) {
        const data = await batchesRes.json();
        console.log("BATCHES in DB:");
        console.log(JSON.stringify(data, null, 2));
    } else {
         console.log(batchesRes.status, await batchesRes.text());
    }
}

checkBatches();
