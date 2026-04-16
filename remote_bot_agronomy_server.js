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
    console.warn("Could not read auth key. Empleando fallback manual");
    SUPABASE_KEY = 'HIDDEN_SECRET_BY_AI';
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
                'Prefer': 'return=minimal' // IMPORTANT: Array multiple insert works better with return=minimal or omit preferential rep for bulk
            }
        };

        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                if(res.statusCode >= 400) return reject(new Error(`Supabase Error ${res.statusCode}: ` + data));
                try {
                   if (!data) return resolve(null);
                   return resolve(JSON.parse(data));
                } catch(pe) {
                   return resolve(data);
                }
            });
        });

        req.on('error', e => reject(e));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

function fuzzyMatch(lookup, targetList) {
    if (!lookup) return null;
    const normalize = str => {
        if (!str) return '';
        return String(str).toLowerCase().replace(/[^a-z0-9áéíóúñ]/g, ' ').replace(/\s+/g, ' ').trim();
    };
    
    const lLower = normalize(lookup);
    let bestMatch = null;
    let highestScore = 0;
    
    for (const item of (targetList || [])) {
        if (!item) continue;
        const iLowerId = normalize(item.id || '');
        const iLowerName = normalize(item.name || '');
        
        if (lLower === iLowerId || lLower === iLowerName) return item;
        
        let score = 0;
        const words = lLower.split(' ');
        const targetWords = iLowerName.split(' ');
        
        for(let w of words) {
            if (!w) continue;
            if (targetWords.includes(w)) score += 2;
            else if (iLowerName.includes(w)) score += 1;
        }
        
        if (score > highestScore) {
            highestScore = score;
            bestMatch = item;
        }
    }
    return highestScore > 0 ? bestMatch : null;
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
                
                function safeParse(val) {
                    if (typeof val === 'string') {
                        try { return JSON.parse(val); } catch(e) { return val; }
                    }
                    return val;
                }
                
                const batches = safeParse(payload.batches) || [];
                const inputs = safeParse(payload.inputs) || [];
                const water_liters = parseFloat(payload.water_liters) || 0;
                const event_type = payload.event_type || 'Aplicacion';
                const raw_description = payload.raw_description || '';
                
                if (!batches || batches.length === 0) {
                    res.writeHead(400); return res.end(JSON.stringify({ error: "No batches provided." }));
                }

                console.log('[BOT-AGRO] Validando Batches...');
                let dbBatches = [];
                const qActiveBatches = await supaFetch('core_batches?stage=neq.completed&select=id,location,strain');
                
                if (qActiveBatches) {
                    qActiveBatches.forEach(b => b.name = b.id + ' ' + (b.strain || ''));
                    // Para cada lote enviado desde N8N, búscalo contra toda la base viva de core_batches (UUIDs, nombres o ID directos)
                    for (const term of batches) {
                       const match = fuzzyMatch(term, qActiveBatches);
                       if (match) dbBatches.push(match);
                    }
                }
                
                console.log('[BOT-AGRO] Q1 done. Matches hallados:', dbBatches.length);
                if (!dbBatches || dbBatches.length === 0) {
                    res.writeHead(404); return res.end(JSON.stringify({ error: "Lotes inválidos o no existen activos." }));
                }
                
                const splitFactor = dbBatches.length;

                // Fetch inventory
                const qInventory = await supaFetch('core_inventory_quimicos?select=id,name,qty,unit_cost');
                
                let totalCalculatedCost = 0;
                let successfulDeductions = [];
                let errors = [];

                const safeInputs = typeof inputs === 'string' ? JSON.parse(inputs) : inputs;
                for (const input of (safeInputs || [])) {
                    const inputName = input.name || input.insumo || input.producto || input.item || input.nombre;
                    const usedQty = parseFloat(input.qty || input.cantidad || input.amount || 1);
                    
                    if (!inputName || isNaN(usedQty)) continue;

                    const match = fuzzyMatch(inputName, qInventory);
                    if (match) {
                        const itemCost = parseFloat(match.unit_cost || 0) * usedQty;
                        totalCalculatedCost += itemCost;
                        
                        // Deduce inventory once globally (for entire tank)
                        const newStock = Math.max(0, parseFloat(match.qty || 0) - usedQty);
                        console.log(`[BOT-AGRO] Actualizando stock global de ${match.name} [Restando ${usedQty}]`);
                        
                        await supaFetch(`core_inventory_quimicos?id=eq.${encodeURIComponent(match.id)}`, 'PATCH', { 
                            qty: newStock, 
                            last_updated: new Date().toISOString() 
                        });
                        
                        successfulDeductions.push({ id: match.id, name: match.name, qtyTot: usedQty, costTot: itemCost });
                    } else {
                        console.warn(`[BOT-AGRO] Miss Insumo: ${inputName}`);
                        errors.push(`Insumo no encontrado: ${inputName}`);
                    }
                }
                
                // Distribute costs
                const costPerBatch = parseFloat((totalCalculatedCost / splitFactor).toFixed(2));
                const waterPerBatch = parseFloat((water_liters / splitFactor).toFixed(2));
                
                const descModifier = successfulDeductions.length > 0 
                    ? `\\n\\n[Distribución Per Cápita (${splitFactor} Lotes)]\\n` + 
                      successfulDeductions.map(d => `- ${d.name}: ${(d.qtyTot / splitFactor).toFixed(2)} proporc. = $${(d.costTot / splitFactor).toFixed(2)}`).join('\\n')
                    : '';

                console.log('[BOT-AGRO] Insertando eventos secuencialmente...');
                const insertedRefs = [];
                
                for (const b of dbBatches) {
                    const evData = {
                        batch_id: b.id,
                        room_id: b.location || null,
                        event_type: event_type,
                        description: (raw_description || 'App Bot Agro NLP') + descModifier,
                        water_liters: waterPerBatch,
                        total_cost: costPerBatch
                    };
                    
                    try {
                        const insRes = await supaFetch('core_agronomic_events', 'POST', evData);
                        insertedRefs.push(b.id);
                    } catch (eInsert) {
                        console.error(`[BOT-AGRO] Falló inserción para lote ${b.id}:`, eInsert.message);
                    }
                }

                console.log('[BOT-AGRO] Operación Completa!');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: `Eventos aplicados a ${insertedRefs.length} lotes con costo div de $${costPerBatch.toFixed(2)}.`,
                    deductions: successfulDeductions,
                    errors
                }));

            } catch (err) {
                console.error(`[BOT-AGRO] Error Fatal: `, err.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    } else { res.writeHead(404); res.end(); }
});

const PORT = 5006;
server.listen(PORT, () => console.log(`[BOT-AGRO] Webhook NLP Native ejecutándose en puerto ${PORT}`));
