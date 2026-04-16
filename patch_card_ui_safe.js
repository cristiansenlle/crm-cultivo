const fs = require('fs');
const jsPath = 'c:/Users/Cristian/.gemini/antigravity/crm cannabis/cultivo.js';

let js = fs.readFileSync(jsPath, 'utf8').replace(/\\r\\n/g, '\\n');

// 1. CARD UI
const t1 = `            <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div style="display:flex; flex-direction:column;">
                    <strong style="font-size: 1.1rem;">\${b.id} - \${b.strain}</strong>
                    <span class="task-time" style="color:\${color}">\${label} - Inicial</span>
                    <span style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 3px;"><i class="ph ph-map-pin"></i> \${roomName} | Origen: \${originText} \${madreText}\${fotoText}</span>
                </div>
                \${actionHtml}
            </div>`.replace(/\\r\\n/g, '\\n');

const r1 = `            <div style="display:flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                <div style="display:flex; flex-direction:column; flex:1;">
                    <div style="display:flex; justify-content: space-between; align-items: center; padding-right:15px;">
                        <strong style="font-size: 1.2rem; color: var(--text-primary);">\${b.id} - \${b.strain}</strong>
                        <div style="text-align:right; display:flex; flex-direction:column;">
                            <span style="font-size: 1.2rem; font-weight: 800; color: #ffb74d;">$\${parseFloat(b.accumulatedCost || 0).toFixed(2)}</span>
                            <span style="font-size: 0.65rem; color: var(--text-secondary); text-transform:uppercase;">Costo</span>
                        </div>
                    </div>
                    <span class="task-time" style="color:\${color}; margin-top:4px;">\${label} - Inicial</span>
                    <span style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 5px;">
                        <i class="ph-fill ph-plant" style="color:var(--color-green);"></i> \${b.numPlants || 0} Plantas | <i class="ph ph-map-pin"></i> \${roomName} | Origen: \${originText} \${madreText}\${fotoText}
                    </span>
                </div>
                <div style="margin-left:auto;">\${actionHtml}</div>
            </div>`.replace(/\\r\\n/g, '\\n');

if (js.includes(t1)) {
    js = js.replace(t1, r1);
    console.log("Card UI Patched successful!");
} else console.log("Card UI not found");

// 2. WATER INPUT UI
const t2 = `<div style="flex: 1 1 80px;"><label style="font-size:0.75rem;">Vol/Pl</label><input type="text" id="nutri-vol-\${index}" placeholder="Ej: 1L" style="width:100%; padding:5px; border-radius:4px; background:#111; color:#fff; border:1px solid #444;"></div>`.replace(/\\r\\n/g, '\\n');
const r2 = `<div style="flex: 1 1 80px;"><label style="font-size:0.75rem;">Agua(L)</label><input type="number" step="0.1" id="nutri-water-\${index}" placeholder="Ej: 5" style="width:100%; padding:5px; border-radius:4px; background:#111; color:#fff; border:1px solid #444;"></div>`.replace(/\\r\\n/g, '\\n');
if (js.includes(t2)) { js = js.replace(t2, r2); console.log("Water UI Patched."); } 
else console.log("Water UI not found");

// 3. LOG NUTRITION CAPTURE
const t3A = `const ec_ph = document.getElementById(\`nutri-ph-\${index}\`).value;\n    const vol = document.getElementById(\`nutri-vol-\${index}\`).value;`.replace(/\\r\\n/g, '\\n');
const r3A = `const ec_ph = document.getElementById(\`nutri-ph-\${index}\`).value;\n    const waterLiters = parseFloat(document.getElementById(\`nutri-water-\${index}\`).value) || 0;`.replace(/\\r\\n/g, '\\n');
if (js.includes(t3A)) { js = js.replace(t3A, r3A); console.log("logNutrition UI capture patched."); }
else console.log("t3A not found");

// 4. LOG NUTRITION SUPABASE INSERT
const t3B = `await window.sbClient.from('core_agronomic_events').insert([{
            batch_id: batchId,
            event_type: 'nutricion',
            product_id: prodId || null,
            amount_applied: prodId ? qty : null,
            details: { ec_ph, vol, product_name: prodId ? nutritionProducts.find(p => p.id === prodId)?.name : 'Sólo Agua' }
        }]);`.replace(/\\r\\n/g, '\\n');
const r3B = `let exactCost = 0;
        let pName = 'Sólo Agua';
        if(prodId) {
            const pObj = nutritionProducts.find(p => p.id === prodId);
            if(pObj) {
                pName = pObj.name;
                exactCost = parseFloat(pObj.unit_cost || 0) * qty;
            }
        }
        await window.sbClient.from('core_agronomic_events').insert([{
            batch_id: batchId,
            event_type: 'nutricion',
            product_id: prodId || null,
            amount_applied: prodId ? qty : null,
            water_liters: waterLiters,
            total_cost: exactCost,
            details: { ec_ph, product_name: pName }
        }]);`.replace(/\\r\\n/g, '\\n');
if (js.includes(t3B)) { js = js.replace(t3B, r3B); console.log("logNutrition Supabase Insert patched."); }
else console.log("t3B not found");

const t3C = `document.getElementById(\`nutri-vol-\${index}\`).value = '';`;
const r3C = `document.getElementById(\`nutri-water-\${index}\`).value = '';`;
if (js.includes(t3C)) js = js.replace(t3C, r3C);

fs.writeFileSync(jsPath, js, 'utf8');
console.log("Done");
