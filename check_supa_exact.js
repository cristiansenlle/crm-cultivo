const axios = require('axios');

async function checkSupa() {
    const url = 'https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/core_batches?select=id,strain,stage,location&order=id.asc';
    const apikey = 'HIDDEN_SECRET_BY_AI';

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
