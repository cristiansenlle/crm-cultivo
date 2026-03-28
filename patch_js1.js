const fs = require('fs');
const filePath = 'c:/Users/Cristian/.gemini/antigravity/crm cannabis/cultivo.js';
let js = fs.readFileSync(filePath, 'utf8');

// Modifying handleNewCrop
const hncTarget = `    const flowerDays = document.getElementById('cropFlowerDays').value;
    const syncGCal = document.getElementById('syncGCal').checked;`;

const hncReplace = `    const flowerDays = document.getElementById('cropFlowerDays').value;
    const syncGCal = document.getElementById('syncGCal').checked;
    const numPlants = document.getElementById('cropNumPlants') ? parseInt(document.getElementById('cropNumPlants').value) || 0 : 0;`;

if(js.includes(hncTarget)){ js = js.replace(hncTarget, hncReplace); console.log("HNC vars patched"); }

const insertTarget = `                flower_days: flowerDays ? parseInt(flowerDays) : null,
                sync_gcal: syncGCal,`;
const insertReplace = `                flower_days: flowerDays ? parseInt(flowerDays) : null,
                num_plants: numPlants,
                sync_gcal: syncGCal,`;
if(js.includes(insertTarget)){ js = js.replace(insertTarget, insertReplace); console.log("HNC insert patched"); }

// Modifying loadBatches
const loadBatchesTarget = `        const { data, error } = await window.sbClient.from('core_batches').select('*').order('timestamp', { ascending: false });
        if (error) throw error;

        batches = (data || []).map(b => ({
            id: b.id,
            strain: b.strain,`;

const loadBatchesReplace = `        const { data, error } = await window.sbClient.from('core_batches').select('*').order('timestamp', { ascending: false });
        if (error) throw error;

        // Fetch Costs for Agronomic Events
        let costMap = {};
        try {
            const { data: events } = await window.sbClient.from('core_agronomic_events').select('batch_id, total_cost');
            if (events) {
                events.forEach(ev => {
                    if (ev.total_cost) {
                        if (!costMap[ev.batch_id]) costMap[ev.batch_id] = 0;
                        costMap[ev.batch_id] += parseFloat(ev.total_cost) || 0;
                    }
                });
            }
        } catch(err) { console.error("Error loading costs:", err); }

        batches = (data || []).map(b => ({
            id: b.id,
            numPlants: b.num_plants || 0,
            accumulatedCost: costMap[b.id] || 0,
            strain: b.strain,`;

if(js.includes(loadBatchesTarget)){ js = js.replace(loadBatchesTarget, loadBatchesReplace); console.log("loadBatches patched"); }

fs.writeFileSync(filePath, js, 'utf8');
console.log("File saved.");
