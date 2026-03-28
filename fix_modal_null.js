const fs = require('fs');
let js = fs.readFileSync('c:/Users/Cristian/.gemini/antigravity/crm cannabis/insumos.js', 'utf8');

// I am going to cleanly split out the broken `openAdjustModal` and put the correct one
const missingFunctions = `
function openAdjustModal(id, name, currentQty, currentUnitCost, unit) {
    // Remove existing modal if any
    document.getElementById('adjustModal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'adjustModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);z-index:1000;display:flex;justify-content:center;align-items:center;';
    modal.innerHTML = \`
        <div style="background:var(--bg-light, #1b2028);border:1px solid var(--border-color, #444);border-radius:12px;padding:2rem;width:400px;max-width:90vw;">
            <h3 style="margin-bottom:15px; font-weight:600;"><i class="ph ph-flask" style="color:var(--color-green)"></i> \${name}</h3>
            <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:1.5rem;"><strong style="color:white;">Stock actual:</strong> \${currentQty} \${unit}</p>
            
            <input type="hidden" id="adjustId" value="\${id}">
            <div style="display:flex; gap:10px; margin-bottom:1.5rem;">
                <div style="flex:1;">
                    <label style="font-size:0.8rem;color:var(--text-secondary);display:block;margin-bottom:6px;">Nuevo valor de stock (\${unit})</label>
                    <input type="number" id="adjustQtyInput" value="\${currentQty}" min="0" step="0.1"
                        style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid #444;background:var(--bg-dark);color:white;font-size:1rem;">
                </div>
                <div style="flex:1;">
                    <label style="font-size:0.8rem;color:var(--text-secondary);display:block;margin-bottom:6px;">Corrección Costo ($)</label>
                    <input type="number" id="adjustCostInput" placeholder="Sin cambios" step="0.01"
                        style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid #444;background:var(--bg-dark);color:white;font-size:1rem;">
                </div>
            </div>
            <p style="font-size:0.75rem; color:var(--text-secondary); margin-top:-10px; margin-bottom:15px; line-height:1.4;">
                <i class="ph ph-info" style="color:var(--color-blue)"></i> Si ingresas una Corrección de Costo, se inyectará una transacción de OPEX automática en Finanzas por esta diferencia.
            </p>
            <div style="display:flex;gap:10px;">
                <button type="button" class="btn btn-secondary" style="flex:1;" onclick="closeAdjustModal()">Cancelar</button>
                <button type="button" class="btn btn-primary" style="flex:1;" onclick="confirmAdjust('\${id}')">Guardar</button>
            </div>
        </div>
    \`;
    document.body.appendChild(modal);
}

function closeAdjustModal() {
    document.getElementById('adjustModal')?.remove();
}

async function confirmAdjust(id) {
    const newQty = parseFloat(document.getElementById('adjustQtyInput').value);
    const newCostInput = document.getElementById('adjustCostInput').value;
    if (isNaN(newQty) || newQty < 0) { alert('Valor inválido'); return; }
    
    try {
        let updates = { qty: newQty, last_updated: new Date().toISOString() };
        
        if (newCostInput && newCostInput !== '') {
            const addedCost = parseFloat(newCostInput);
            if (!isNaN(addedCost) && addedCost !== 0) {
                 const item = core_inventory.quimicos.find(q => q.id === id);
                 const currentTotalVal = (item.unit_cost || 0) * item.qty;
                 const newTotalVal = currentTotalVal + addedCost;
                 const newUnitCost = newQty > 0 ? (newTotalVal / newQty) : null;
                 updates.unit_cost = newUnitCost;
                 
                 await window.sbClient.from('core_sales').insert([{
                     tx_id: 'OPEX-CORRECCION-' + Date.now(),
                     date: new Date().toISOString(),
                     item_id: 'Corrección Insumo: ' + item.name,
                     qty_sold: 0,
                     revenue: 0,
                     cost_of_goods: addedCost,
                     client: 'proveedor_opex'
                 }]);
            }
        }
        await window.sbClient.from('core_inventory_quimicos').update(updates).eq('id', id);
        
        closeAdjustModal();
        await fetchInventory();
    } catch (err) {
        console.error("Error ajustando stock:", err);
        alert("Fallo al ajustar stock.");
    }
}
`;

// Replace everything between function openAdjustModal and async function removeQuimico
const partsA = js.split('function openAdjustModal');
const partsB = partsA[1].split('async function removeQuimico');

js = partsA[0] + missingFunctions + "\nasync function removeQuimico" + partsB[1];
fs.writeFileSync('c:/Users/Cristian/.gemini/antigravity/crm cannabis/insumos.js', js);
console.log("Modal Fixed");
