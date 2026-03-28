const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'opnjrzixsrizdnphbjnq.supabase.co';
let SUPABASE_KEY = '';

try {
    const clientConfig = fs.readFileSync(path.join(__dirname, 'supabase-client.js'), 'utf8');
    const keyMatch = clientConfig.match(/const SUPABASE_ANON_KEY = "(.*?)"/);
    if (keyMatch) SUPABASE_KEY = keyMatch[1];
} catch (e) {
    console.warn("Could not read auth key");
}

async function supaFetch(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: SUPABASE_URL,
            path: '/rest/v1/' + path,
            method: method,
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        };

        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                if(res.statusCode >= 400) return reject(new Error(`Supabase Error ${res.statusCode}: ` + data));
                resolve(data ? JSON.parse(data) : null);
            });
        });

        req.on('error', e => reject(e));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

function fuzzyMatch(lookup, targetList) {
    const lLower = lookup.toLowerCase().trim();
    let bestMatch = null;
    let highestScore = 0;
    
    for (const item of targetList) {
        const iLower = item.name.toLowerCase();
        if (lLower === iLower) return item;
        
        let score = 0;
        const words = lLower.split(' ');
        for(let w of words) {
            if(w.length > 2 && iLower.includes(w)) score++;
        }
        if (score > highestScore) {
            highestScore = score;
            bestMatch = item;
        }
    }
    return highestScore >= 1 ? bestMatch : null;
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

    if (req.method === 'POST' && req.url === '/bot-agronomico') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const payload = JSON.parse(body);
                console.log(`[BOT-AGRO] RAW Payload:`, JSON.stringify(payload));
                
                // n8n toolHttpRequest sends placeholders as strings even when they are JSON arrays
                // Auto-parse any field that looks like a JSON string
                function safeParse(val) {
                    if (typeof val === 'string') {
                        try { return JSON.parse(val); } catch(e) { return val; }
                    }
                    return val;
                }
                
                const batches = safeParse(payload.batches) || [];
                const inputs = safeParse(payload.inputs) || [];
                const water_liters = payload.water_liters;
                const event_type = payload.event_type;
                const raw_description = payload.raw_description;
                
                console.log(`[BOT-AGRO] Parsed batches:`, batches);
                console.log(`[BOT-AGRO] Parsed inputs:`, inputs);
                
                if (!batches || batches.length === 0) {
                    console.warn('[BOT-AGRO] No batches — sending 400');
                    res.writeHead(400); return res.end(JSON.stringify({ error: "No batches provided." }));
                }

                
                // 1. Fetch valid batches
                const batchFilter = batches.map(b => `"${b}"`).join(',');
                const dbBatches = await supaFetch(`core_batches?id=in.(${encodeURIComponent(batchFilter)})&select=id,location`);
                if (!dbBatches || dbBatches.length === 0) {
                    res.writeHead(404); return res.end(JSON.stringify({ error: "Lotes inválidos." }));
                }
                
                const splitFactor = dbBatches.length;

                // 2. Fetch inventory
                const qInventory = await supaFetch('core_inventory_quimicos?select=*');

                let totalCalculatedCost = 0;
                let successfulDeductions = [];
                let errors = [];

                // 3. Process inputs
                for (const input of (inputs || [])) {
                    const match = fuzzyMatch(input.name, qInventory);
                    if (match) {
                        const usedQty = parseFloat(input.qty);
                        const itemCost = parseFloat(match.unit_cost || 0) * usedQty;
                        totalCalculatedCost += itemCost;
                        
                        const newStock = Math.max(0, match.qty - usedQty);
                        await supaFetch(`core_inventory_quimicos?id=eq.${encodeURIComponent(match.id)}`, 'PATCH', { 
                            qty: newStock, 
                            last_updated: new Date().toISOString() 
                        });
                        
                        successfulDeductions.push({ id: match.id, name: match.name, qty: usedQty, cost: itemCost });
                    } else {
                        console.warn(`[BOT-AGRO] Fallo Fuzzy Match: ${input.name}`);
                        errors.push(`Insumo no encontrado: ${input.name}`);
                    }
                }
                
                // 4. Distribute costs
                const costPerBatch = totalCalculatedCost / splitFactor;
                const waterPerBatch = (parseFloat(water_liters) || 0) / splitFactor;
                
                // 5. Insert to core_agronomic_events
                const eventsToInsert = dbBatches.map(b => {
                    const descModifier = successfulDeductions.length > 0 
                        ? `\n--- Bot Auto-Deductions ---\n${successfulDeductions.map(d => `${d.name}: ${d.qty}ml/g ($${d.cost.toFixed(2)})`).join('\n')}`
                        : '';

                    return {
                        batch_id: b.id,
                        room_id: b.location,
                        event_type: event_type || 'Aplicacion',
                        description: (raw_description || 'Aplicación Bot NLP') + descModifier,
                        water_liters: waterPerBatch,
                        total_cost: costPerBatch
                    };
                });
                
                await supaFetch('core_agronomic_events', 'POST', eventsToInsert);

                // 6. Response
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: `Eventos aplicados a ${splitFactor} lotes con costo per capita de $${costPerBatch.toFixed(2)}`,
                    deductions: successfulDeductions,
                    errors
                }));

            } catch (err) {
                console.error(`[BOT-AGRO] Error: `, err.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    } else { res.writeHead(404); res.end(); }
});

const PORT = 5006;
server.listen(PORT, () => console.log(`[BOT-AGRO] Webhook NLP Native ejecutándose en puerto ${PORT}`));
