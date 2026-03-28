const axios = require('axios');

async function checkSupa() {
    const url = 'https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/core_batches?select=id,strain,stage,location&order=id.asc';
    const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8';

    try {
        const res = await axios.get(url, {
            headers: {
                'apikey': apikey,
                'Authorization': `Bearer ${apikey}`,
                'Content-Type': 'application/json'
            }
        });
        console.log("Response length:", res.data.length);
        console.log(JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error(e.response ? e.response.data : e.message);
    }
}

checkSupa();
