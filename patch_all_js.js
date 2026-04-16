const fs = require('fs');
const jsPath = 'c:/Users/Cristian/.gemini/antigravity/crm cannabis/cultivo.js';

let js = fs.readFileSync(jsPath, 'utf8');

// Target 1: Card UI
const t1 = `                <div style="display:flex; flex-direction:column;">
                    <strong style="font-size: 1.1rem;">\${b.id} - \${b.strain}</strong>
                    <span class="task-time" style="color:\${color}">\${label} - Inicial</span>
                    <span style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 3px;"><i class="ph ph-map-pin"></i> \${roomName} | Origen: \${originText} \${madreText}\${fotoText}</span>
                </div>
                \${actionHtml}`;

const r1 = `                <div style="display:flex; flex-direction:column; flex:1;">
                    <div style="display:flex; justify-content: space-between; align-items: center; padding-right:15px;">
                        <strong style="font-size: 1.2rem; color: var(--text-primary);">\${b.id} - \${b.strain}</strong>
                        <div style="text-align:right; display:flex; flex-direction:column;">
                            <span style="font-size: 1.2rem; font-weight: 800; color: #ffb74d;">$\${parseFloat(b.accumulatedCost || 0).toFixed(2)}</span>
                            <span style="font-size: 0.65rem; color: var(--text-secondary); text-transform:uppercase;">Costo Acumulado</span>
                        </div>
                    </div>
                    <span class="task-time" style="color:\${color}; margin-top:4px;">\${label} - Inicial</span>
                    <span style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 5px;">
                        <i class="ph-fill ph-plant" style="color:var(--color-green);"></i> \${b.numPlants} Plantas | <i class="ph ph-map-pin"></i> \${roomName} | Origen: \${originText} \${madreText}\${fotoText}
                    </span>
                </div>
                <div style="margin-left:auto;">\${actionHtml}</div>`;

if(js.indexOf(t1) !== -1) {
    js = js.replace(t1, r1);
    console.log("Card UI Patched");
} else {
    // If CRLF format fails, Let's try splitting it exactly
    let startIdx = js.indexOf('<strong style="font-size: 1.1rem;">${b.id}');
    if (startIdx > -1) {
        console.log("Card UI anchor found via index.");
        let p1 = js.substring(0, js.lastIndexOf('<div style="display:flex; flex-direction:column;">', startIdx));
        let endIdx = js.indexOf('</div>\n                ${actionHtml}', startIdx);
        let p2 = js.substring(endIdx + 36);
        js = p1 + r1 + p2;
        console.log("Card UI Patched manually");
    } else {
        console.log("Card UI Target NOT FOUND at all");
    }
}

// Target 2: Water Inputs
const t2 = `<div style="flex: 1 1 80px;"><label style="font-size:0.75rem;">Vol/Pl</label><input type="text" id="nutri-vol-\${index}" placeholder="Ej: 1L" style="width:100%; padding:5px; border-radius:4px; background:#111; color:#fff; border:1px solid #444;"></div>`;
const r2 = `<div style="flex: 1 1 80px;"><label style="font-size:0.75rem;">Agua(L)</label><input type="number" step="0.1" id="nutri-water-\${index}" placeholder="Ej: 5" style="width:100%; padding:5px; border-radius:4px; background:#111; color:#fff; border:1px solid #444;"></div>`;

if (js.indexOf(t2) !== -1) {
    js = js.replace(t2, r2);
    console.log("Water Input Patched");
}

// Target 3: logNutrition logic
const t3A = `const ec_ph = document.getElementById(\`nutri-ph-\${index}\`).value;
    const vol = document.getElementById(\`nutri-vol-\${index}\`).value;`;
const r3A = `const ec_ph = document.getElementById(\`nutri-ph-\${index}\`).value;
    const waterLiters = parseFloat(document.getElementById(\`nutri-water-\${index}\`).value) || 0;`;

if(js.indexOf(t3A) !== -1) js = js.replace(t3A, r3A);
else {
    let fix3A = js.indexOf('const vol = document.getElementById(`nutri-vol-${index}`).value;');
    if (fix3A > -1) js = js.substring(0, fix3A) + r3A + js.substring(fix3A + 66);
}

const t3B = `await window.sbClient.from('core_agronomic_events').insert([{
            batch_id: batchId,
            event_type: 'nutricion',
            product_id: prodId || null,
            amount_applied: prodId ? qty : null,
            details: { ec_ph, vol, product_name: prodId ? nutritionProducts.find(p => p.id === prodId)?.name : 'Sólo Agua' }
        }]);`;
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
        }]);`;

if(js.indexOf(t3B) !== -1) {
    js = js.replace(t3B, r3B);
} else {
    // try index
    let fix3B = js.indexOf("details: { ec_ph, vol, product_name");
    if (fix3B > -1) {
        let p1 = js.substring(0, js.lastIndexOf("await window.sbClient", fix3B));
        let p2 = js.substring(js.indexOf("}]);", fix3B) + 4);
        js = p1 + r3B + p2;
        console.log("logNutrition Insert Patched Manually");
    }
}

const t3C = `document.getElementById(\`nutri-vol-\${index}\`).value = '';`;
const r3C = `document.getElementById(\`nutri-water-\${index}\`).value = '';`;
if (js.indexOf(t3C) !== -1) js = js.replace(t3C, r3C);

fs.writeFileSync(jsPath, js, 'utf8');
console.log("Final Patch Finished. Check logs to confirm insertions.");
