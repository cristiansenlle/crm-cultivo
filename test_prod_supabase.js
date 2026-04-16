const axios = require('axios');

async function checkProdDb() {
    const PROD_KEY = 'HIDDEN_SECRET_BY_AI';
    try {
        const res = await axios.get('https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/core_batches?select=id,strain,stage,location&order=id.asc', {
            headers: {
                'apikey': PROD_KEY,
                'Authorization': 'Bearer ' + PROD_KEY
            }
        });
        console.log(JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error(e.response ? e.response.data : e.message);
    }
}

checkProdDb();
