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
            let data = ''; res.on('data', chunk => { data += chunk; });
            res.on('end', () => resolve({status: res.statusCode, body: data}));
        });
        req.on('error', e => reject(e)); req.end();
    });
}
(async () => {
   const check1 = await supaFetch('core_inventory_quimicos?limit=1');
   console.log("core_inventory_quimicos cols:", Object.keys(JSON.parse(check1.body)[0] || {}));
})();
