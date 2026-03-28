const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

async function recoverAndPatch() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });
    console.log("Downloading cultivo.js...");
    await ssh.getFile('c:/Users/Cristian/.gemini/antigravity/crm cannabis/cultivo.js', '/opt/crm-cannabis/cultivo.js');
    console.log("Recovered cultivo.js");
    ssh.dispose();

    let js = fs.readFileSync('c:/Users/Cristian/.gemini/antigravity/crm cannabis/cultivo.js', 'utf8');

    // 1. handleNewCrop
    const tHNC = `    const flowerDays = document.getElementById('cropFlowerDays').value;
    const syncGCal = document.getElementById('syncGCal').checked;`;
    const rHNC = `    const flowerDays = document.getElementById('cropFlowerDays').value;
    const syncGCal = document.getElementById('syncGCal').checked;
    const numPlants = document.getElementById('cropNumPlants') ? parseInt(document.getElementById('cropNumPlants').value) || 0 : 0;`;
    js = js.replace(tHNC, rHNC);

    const tHNC2 = `                flower_days: flowerDays ? parseInt(flowerDays) : null,
                sync_gcal: syncGCal,`;
    const rHNC2 = `                flower_days: flowerDays ? parseInt(flowerDays) : null,
                num_plants: numPlants,
                sync_gcal: syncGCal,`;
    js = js.replace(tHNC2, rHNC2);

    // 2. loadBatches
    const tLB = `        const { data, error } = await window.sbClient.from('core_batches').select('*').order('timestamp', { ascending: false });
        if (error) throw error;

        batches = (data || []).map(b => ({
            id: b.id,
            strain: b.strain,`;
    const rLB = `        const { data, error } = await window.sbClient.from('core_batches').select('*').order('timestamp', { ascending: false });
        if (error) throw error;

        let costMap = {};
        try {
            const { data: events } = await window.sbClient.from('core_agronomic_events').select('batch_id, total_cost').not('total_cost', 'is', null);
            if (events) {
                events.forEach(ev => {
                    if (!costMap[ev.batch_id]) costMap[ev.batch_id] = 0;
                    costMap[ev.batch_id] += parseFloat(ev.total_cost || 0);
                });
            }
        } catch(err) {}

        batches = (data || []).map(b => ({
            id: b.id,
            numPlants: b.num_plants || 0,
            accumulatedCost: costMap[b.id] || 0,
            strain: b.strain,`;
    js = js.replace(tLB, rLB);

    // 3. renderBatches block 1
    const tRB1 = `                <div style="display:flex; flex-direction:column;">
                    <strong style="font-size: 1.1rem;">\${b.id} - \${b.strain}</strong>
                    <span class="task-time" style="color:\${color}">\${label} - Inicial</span>
                    <span style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 3px;"><i class="ph ph-map-pin"></i> \${roomName} | Origen: \${originText} \${madreText}\${fotoText}</span>
                </div>
                \${actionHtml}
            </div>`;
    const rRB1 = `                <div style="display:flex; flex-direction:column; flex:1;">
                    <div style="display:flex; justify-content: space-between; align-items: flex-start; padding-right:15px;">
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
                <div style="margin-left:auto;">\${actionHtml}</div>
            </div>`;
    js = js.replace(tRB1, rRB1);

    // 4. renderBatches block 2 (nutri inputs)
    const tRB2 = `<div style="flex: 1 1 80px;"><label style="font-size:0.75rem;">Vol/Pl</label><input type="text" id="nutri-vol-\${index}" placeholder="Ej: 1L" style="width:100%; padding:5px; border-radius:4px; background:#111; color:#fff; border:1px solid #444;"></div>`;
    const rRB2 = `<div style="flex: 1 1 80px;"><label style="font-size:0.75rem;">Agua(L)</label><input type="number" step="0.1" id="nutri-water-\${index}" placeholder="Ej: 5" style="width:100%; padding:5px; border-radius:4px; background:#111; color:#fff; border:1px solid #444;"></div>`;
    js = js.replace(tRB2, rRB2);

    // 5. logNutrition inputs
    const tLN1 = `    const ec_ph = document.getElementById(\`nutri-ph-\${index}\`).value;
    const vol = document.getElementById(\`nutri-vol-\${index}\`).value;

    if (prodId && qty <= 0) return alert("Debe ingresar una cantidad a descontar mayor a 0.");`;
    const rLN1 = `    const ec_ph = document.getElementById(\`nutri-ph-\${index}\`).value;
    const waterLiters = parseFloat(document.getElementById(\`nutri-water-\${index}\`).value) || 0;

    if (prodId && qty <= 0) return alert("Debe ingresar una cantidad a descontar mayor a 0.");

    let exactCost = 0;
    let pName = 'Sólo Agua';
    if(prodId) {
        const pObj = nutritionProducts.find(p => p.id === prodId);
        if(pObj) {
            pName = pObj.name;
            exactCost = (pObj.unit_cost || 0) * qty;
        }
    }`;
    js = js.replace(tLN1, rLN1);

    // 6. logNutrition insert
    const tLN2 = `        // 1. Guardar Evento
        await window.sbClient.from('core_agronomic_events').insert([{
            batch_id: batchId,
            event_type: 'nutricion',
            product_id: prodId || null,
            amount_applied: prodId ? qty : null,
            details: { ec_ph, vol, product_name: prodId ? nutritionProducts.find(p => p.id === prodId)?.name : 'Sólo Agua' }
        }]);`;
    const rLN2 = `        // 1. Guardar Evento
        await window.sbClient.from('core_agronomic_events').insert([{
            batch_id: batchId,
            event_type: 'nutricion',
            product_id: prodId || null,
            amount_applied: prodId ? qty : null,
            water_liters: waterLiters,
            total_cost: exactCost,
            details: { ec_ph, product_name: pName }
        }]);`;
    js = js.replace(tLN2, rLN2);

    // 7. logNutrition clear
    const tLN3 = `        document.getElementById(\`nutri-ph-\${index}\`).value = '';
        document.getElementById(\`nutri-vol-\${index}\`).value = '';`;
    const rLN3 = `        document.getElementById(\`nutri-ph-\${index}\`).value = '';
        document.getElementById(\`nutri-water-\${index}\`).value = '';`;
    js = js.replace(tLN3, rLN3);

    // 8. openEditBatchModal
    const tOE = `    document.getElementById('editBatchFlowerDays').value = batch.flowerDays || 60;`;
    const rOE = `    document.getElementById('editBatchFlowerDays').value = batch.flowerDays || 60;
    document.getElementById('editBatchPlants').value = batch.numPlants || 0;`;
    js = js.replace(tOE, rOE);

    // 9. confirmEditBatch
    const tCE1 = `    const location = document.getElementById('editBatchLocation').value;
    const flowerDays = document.getElementById('editBatchFlowerDays').value;`;
    const rCE1 = `    const location = document.getElementById('editBatchLocation').value;
    const flowerDays = document.getElementById('editBatchFlowerDays').value;
    const numPlants = document.getElementById('editBatchPlants').value;`;
    js = js.replace(tCE1, rCE1);

    const tCE2 = `                location: location,
                flower_days: flowerDays ? parseInt(flowerDays) : null
            }).eq('id', originalId);`;
    const rCE2 = `                location: location,
                flower_days: flowerDays ? parseInt(flowerDays) : null,
                num_plants: numPlants ? parseInt(numPlants) : 0
            }).eq('id', originalId);`;
    js = js.replace(tCE2, rCE2);

    fs.writeFileSync('c:/Users/Cristian/.gemini/antigravity/crm cannabis/cultivo.js', js, 'utf8');
    console.log("PATCH COMPLETE");
}
recoverAndPatch().catch(console.error);
