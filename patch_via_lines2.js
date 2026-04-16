const fs = require('fs');
const jsPath = 'c:/Users/Cristian/.gemini/antigravity/crm cannabis/cultivo.js';

let js = fs.readFileSync(jsPath, 'utf8');
let lines = js.split(/\r?\n/);

// TARGET 1: Card UI
let idx1 = lines.findIndex(l => l.includes('<strong style="font-size: 1.1rem;">${b.id} - ${b.strain}</strong>'));
if (idx1 > -1) {
    lines[idx1 - 1] = '                <div style="display:flex; flex-direction:column; flex:1;">';
    lines[idx1] = `                    <div style="display:flex; justify-content: space-between; align-items: center; padding-right:15px;">
                        <strong style="font-size: 1.2rem; color: var(--text-primary);">\${b.id} - \${b.strain}</strong>
                        <div style="text-align:right; display:flex; flex-direction:column;">
                            <span style="font-size: 1.2rem; font-weight: 800; color: #ffb74d;">$\${parseFloat(b.accumulatedCost || 0).toFixed(2)}</span>
                            <span style="font-size: 0.65rem; color: var(--text-secondary); text-transform:uppercase;">Costo Acumulado</span>
                        </div>
                    </div>`;
    lines[idx1 + 1] = `                    <span class="task-time" style="color:\${color}; margin-top:4px;">\${label} - Inicial</span>`;
    lines[idx1 + 2] = `                    <span style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 5px;">
                        <i class="ph-fill ph-plant" style="color:var(--color-green);"></i> \${b.numPlants || 0} Plantas | <i class="ph ph-map-pin"></i> \${roomName} | Origen: \${originText} \${madreText}\${fotoText}
                    </span>`;
    console.log("Card UI Patched");
}

// TARGET 2: Water Inputs 
let idx2 = lines.findIndex(l => l.includes('<div style="flex: 1 1 80px;"><label style="font-size:0.75rem;">Vol/Pl</label><input type="text" id="nutri-vol-${index}" placeholder="Ej: 1L" style="width:100%; padding:5px; border-radius:4px; background:#111; color:#fff; border:1px solid #444;"></div>'));
if (idx2 > -1) {
    lines[idx2] = `                    <div style="flex: 1 1 80px;"><label style="font-size:0.75rem;">Agua(L)</label><input type="number" step="0.1" id="nutri-water-\${index}" placeholder="Ej: 5" style="width:100%; padding:5px; border-radius:4px; background:#111; color:#fff; border:1px solid #444;"></div>`;
    console.log("Water UI Patched");
}

let idx3 = lines.findIndex(l => l.includes('const vol = document.getElementById(`nutri-vol-${index}`).value;'));
if (idx3 > -1) {
    lines[idx3] = `    const waterLiters = parseFloat(document.getElementById(\`nutri-water-\${index}\`).value) || 0;`;
    console.log("logNutrition vars patched");
}

let idx4 = lines.findIndex(l => l.includes('details: { ec_ph, vol, product_name: prodId ? nutritionProducts.find(p => p.id === prodId)?.name : \'Sólo Agua\' }'));
if (idx4 > -1) {
    lines.splice(idx4 - 4, 1, `        let exactCost = 0;
        let pName = 'Sólo Agua';
        if(prodId) {
            const pObj = nutritionProducts.find(p => p.id === prodId);
            if(pObj) {
                pName = pObj.name;
                exactCost = parseFloat(pObj.unit_cost || 0) * qty;
            }
        }
        await window.sbClient.from('core_agronomic_events').insert([{`);
    lines[idx4 + 2] = `            water_liters: waterLiters,
            total_cost: exactCost,
            details: { ec_ph, product_name: pName }`;
    console.log("logNutrition Insert patched");
}

let idx5 = lines.findIndex(l => l.includes('document.getElementById(`nutri-vol-${index}`).value = \'\';'));
if (idx5 > -1) {
    lines[idx5] = `        document.getElementById(\`nutri-water-\${index}\`).value = '';`;
}

let hookFound = false;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("coreRoomsMap[room.id] = room.name;") && lines[i+1].includes("});")) {
        lines.splice(i+2, 0, `            if (typeof populateLocationSelects === 'function') { populateLocationSelects(); }`);
        hookFound = true;
        break;
    }
}
if(hookFound) console.log("Hook Restored");

// FINAL OUTPUT
let out = lines.join('\n'); // using real \n so JS lines are retained across rows
fs.writeFileSync(jsPath, out, 'utf8');
console.log("Lines written correctly");
