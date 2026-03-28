const axios = require('axios');

async function testBoth() {
    const TEST_URL = "https://dvvfdsaqvcyftaaronhd.supabase.co/rest/v1/core_batches";
    const PROD_URL = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/core_batches";

    const TEST_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmZkc2FxdmN5ZnRhYXJvbmhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMDg5MTQsImV4cCI6MjA2MDc4NDkxNH0.7c2yB9z2Ym9F3eM7lJ2u8M0n4eI3vV7X3Q4m0e7Vb3E';
    const PROD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8';

    console.log("--- TEST DB ---\n");
    try {
        let res = await axios.get(TEST_URL + "?select=id,strain", { headers: { apikey: TEST_KEY, Authorization: 'Bearer ' + TEST_KEY } });
        console.log(res.data);
    } catch (e) { console.log('Test DB error:', e.message); }

    console.log("\n--- PROD DB ---\n");
    try {
        let res = await axios.get(PROD_URL + "?select=id,strain", { headers: { apikey: PROD_KEY, Authorization: 'Bearer ' + PROD_KEY } });
        console.log(res.data);
    } catch (e) { console.log('Prod DB error:', e.message); }
}
testBoth();
