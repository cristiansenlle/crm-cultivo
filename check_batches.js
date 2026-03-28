require('dotenv').config();
const fs = require('fs');

const url = "https://opnjrzixsrizdnphbjnq.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8";

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
