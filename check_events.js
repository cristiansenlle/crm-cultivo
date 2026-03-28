require('dotenv').config();
const fs = require('fs');

const url = "https://opnjrzixsrizdnphbjnq.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8";

async function checkEvents() {
    const fetchOpts = {
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`
        }
    };
    
    console.log("Fetching core_agronomic_events...");
    const eventsRes = await fetch(`${url}/rest/v1/core_agronomic_events?order=date_occurred.desc&limit=10`, fetchOpts);
    if (eventsRes.ok) {
        const data = await eventsRes.json();
        console.log("LAST 10 EVENTS:");
        console.log(JSON.stringify(data, null, 2));
    } else {
         console.log(eventsRes.status, await eventsRes.text());
    }
}

checkEvents();
