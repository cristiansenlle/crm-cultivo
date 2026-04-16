const axios = require('axios');

async function testBoth() {
    const TEST_URL = "https://dvvfdsaqvcyftaaronhd.supabase.co/rest/v1/core_batches";
    const PROD_URL = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/core_batches";

    const TEST_KEY = 'HIDDEN_SECRET_BY_AI';
    const PROD_KEY = 'HIDDEN_SECRET_BY_AI';

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
