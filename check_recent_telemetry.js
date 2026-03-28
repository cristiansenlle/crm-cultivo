const axios = require('axios');

const SUPABASE_URL = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/daily_telemetry?select=*&order=created_at.desc&limit=5";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8";

async function checkRecentTelemetry() {
    console.log('Fetching last 5 telemetry records from Supabase...');
    try {
        const response = await axios.get(SUPABASE_URL, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        console.log('Recent telemetry:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error fetching data:', error.response ? error.response.data : error.message);
    }
}

checkRecentTelemetry();
