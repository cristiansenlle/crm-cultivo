const fs = require('fs');
const https = require('https');

async function supaFetch(path, method = 'GET') {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'opnjrzixsrizdnphbjnq.supabase.co',
            path: '/rest/v1/' + path,
            method: method,
            headers: {
                'apikey': 'HIDDEN_SECRET_BY_AI',
                'Authorization': `Bearer HIDDEN_SECRET_BY_AI`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                resolve({status: res.statusCode, body: data});
            });
        });

        req.on('error', e => reject(e));
        req.end();
    });
}

(async () => {
   const check1 = await supaFetch('core_inventory_quimicos?limit=1');
   console.log("core_inventory_quimicos", check1.status);
   const check2 = await supaFetch('core_inventory_insumos?limit=1');
   console.log("core_inventory_insumos", check2.status);
   const check3 = await supaFetch('core_agronomic_events?limit=1');
   console.log("core_agronomic_events", check3.status);
   
   if (check3.status === 200) {
       console.log("Agro Events columns:", Object.keys(JSON.parse(check3.body)[0] || {}));
   }
})();
