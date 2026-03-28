// CANNABIS-CORE 360 - Warehouse & Inventory Logic (Supabase Cloud Edition)

let core_inventory = {
    quimicos: [],
    cosechas: [] // Lotes vendibles
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    await fetchInventory();
});

async function fetchInventory() {
    try {
        if (!window.sbClient) {
            console.error("Supabase client not initialized.");
            return;
        }

        const { data: qData, error: qErr } = await window.sbClient.from('core_inventory_quimicos').select('*');
        if (qErr) throw qErr;
        core_inventory.quimicos = qData || [];

        const { data: cData, error: cErr } = await window.sbClient.from('core_inventory_cosechas').select('*');
        if (cErr) throw cErr;
        core_inventory.cosechas = cData || [];

        renderInventory();
    } catch (e) {
        console.error("Error cargando inventario desde la nube:", e);
        alert("Modo Off-line. Error conectando con el servidor central.");
    }
}

// --- UI Interaction ---
function switchInventoryTab(tabType) {
    document.querySelectorAll('.tabs-header button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.inventory-panel').forEach(p => p.style.display = 'none');

    document.getElementById(`tab-${tabType}`).classList.add('active');
    document.getElementById(`panel-${tabType}`).style.display = 'block';
}

// Define which types go to each Supabase table
const COSECHA_TYPES = ['cosecha_b2b', 'cosecha_local'];

const TYPE_UNIT_MAP = {
    fertilizante: { label: 'Cantidad (mL / cc)', unit: 'mL' },
    estimulador: { label: 'Cantidad (mL / cc)', unit: 'mL' },
    correctivo_ph: { label: 'Cantidad (mL / litros)', unit: 'mL' },
    sustrato: { label: 'Cantidad (Litros)', unit: 'Lts' },
    maceta: { label: 'Cantidad (Unidades)', unit: 'u' },
    pesticida_biologico: { label: 'Cantidad (mL / gr)', unit: 'mL' },
    fungicida: { label: 'Cantidad (mL / gr)', unit: 'mL' },
    acaricida: { label: 'Cantidad (mL / gr)', unit: 'mL' },
    semilla: { label: 'Cantidad (Unidades)', unit: 'u' },
    embalaje: { label: 'Cantidad (Unidades)', unit: 'u' },
    equipamiento: { label: 'Cantidad (Unidades)', unit: 'u' },
    cosecha_b2b: { label: 'Cantidad (Gramos)', unit: 'g' },
    cosecha_local: { label: 'Cantidad (Gramos)', unit: 'g' },
};

function toggleInsumoFields() {
    const type = document.getElementById('insumoType').value;
    const qtyLabel = document.getElementById('lblQty');
    const mapping = TYPE_UNIT_MAP[type] || { label: 'Cantidad', unit: 'u' };
    qtyLabel.innerText = mapping.label;
}

// --- Data Management ---
async function handleIngreso(e) {
    e.preventDefault();

    const btn = e.target.querySelector('button');
    const ogText = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Guardando en Nube...';
    btn.disabled = true;

    try {
        const type = document.getElementById('insumoType').value;
        const name = document.getElementById('insumoName').value.trim();
        const qty = parseFloat(document.getElementById('insumoQty').value);
        const price = parseFloat(document.getElementById('insumoPrice').value) || 0;
        const isCosecha = COSECHA_TYPES.includes(type);

        if (isCosecha) {
            // → core_inventory_cosechas
            const entryId = name.toUpperCase().replace(/\s+/g, '-');
            const existing = core_inventory.cosechas.find(c => c.id === entryId);
            if (existing) {
                await window.sbClient.from('core_inventory_cosechas').update({
                    qty: existing.qty + qty,
                    price: (existing.price || 0) + price,
                    date_added: new Date().toISOString()
                }).eq('id', entryId);
            } else {
                await window.sbClient.from('core_inventory_cosechas').insert([{
                    id: entryId,
                    name: name,
                    type: type,
                    qty: qty,
                    price: price
                }]);
            }
        } else {
            // → core_inventory_quimicos
            const existing = core_inventory.quimicos.find(q => q.name.toLowerCase() === name.toLowerCase());
            if (existing) {
                await window.sbClient.from('core_inventory_quimicos').update({
                    qty: existing.qty + qty,
                    last_updated: new Date().toISOString()
                }).eq('id', existing.id);
            } else {
                const unit_cost = price > 0 ? (price / qty) : null;
                await window.sbClient.from('core_inventory_quimicos').insert([{
                    name: name,
                    type: type,
                    qty: qty,
                    min_stock: 0,
                    unit_cost: unit_cost
                }]);
            }
        }

        // Registrar gasto financiero
        if (price > 0) {
            await window.sbClient.from('core_sales').insert([{
                tx_id: 'OPEX-BODEGA-' + Date.now(),
                date: new Date().toISOString(),
                item_id: 'Compra: ' + name,
                qty_sold: qty,
                revenue: 0,
                cost_of_goods: price,
                client: 'proveedor_opex'
            }]);
        }

        // Fetch de nuevo para actualizar UI
        await fetchInventory();

        // Reset Form
        e.target.reset();
        toggleInsumoFields();

        btn.innerHTML = '<i class="ph ph-check"></i> ¡Sincronizado!';
        btn.style.backgroundColor = 'var(--color-green)';
        setTimeout(() => {
            btn.innerHTML = ogText;
            btn.style.backgroundColor = '';
            btn.disabled = false;
        }, 2000);

    } catch (err) {
        console.error("Error ingresando a la Nube:", err);
        alert("Error de red. Intenta nuevamente.");
        btn.innerHTML = ogText;
        btn.disabled = false;
    }
}

// --- Rendering ---

function renderInventory() {

    // 1. Render Quimicos
    const tbodyQ = document.getElementById('quimicosTableBody');
    tbodyQ.innerHTML = '';
    if (core_inventory.quimicos.length === 0) {
        tbodyQ.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--text-secondary);">Sin registros. Ingresá mercadería con el formulario.</td></tr>`;
    }
    core_inventory.quimicos.forEach(item => {
        const unit = (TYPE_UNIT_MAP[item.type] || { unit: 'u' }).unit;
        let statusTag = '';
        if (item.qty <= 0) {
            statusTag = `<span class="badge" style="background:#400; color:#ff4444; border:1px solid #ff4444;">Agotado</span>`;
        } else if (item.qty < 500) {
            statusTag = `<span class="badge" style="background:#440; color:#ffff44; border:1px solid #ffff44;">Bajo Stock</span>`;
        } else {
            statusTag = `<span class="badge" style="background:#040; color:#44ff44; border:1px solid #44ff44;">Óptimo</span>`;
        }
        
        const totalCost = item.unit_cost && item.qty > 0 ? (item.unit_cost * item.qty).toLocaleString('en-US',{minimumFractionDigits:2}) : 'N/A';
        const costStr = item.unit_cost ? `<span style="color:var(--color-red);">$${totalCost}</span> <br><small style="color:var(--text-secondary)">$${item.unit_cost.toLocaleString('en-US',{minimumFractionDigits:2})}/${unit}</small>` : '<span style="color:var(--text-secondary)">-</span>';

        tbodyQ.innerHTML += `
        <tr>
            <td style="padding: 0.75rem 0; font-weight: 600;">${item.name}</td>
            <td style="color: var(--text-secondary); text-transform: capitalize;">${item.type}</td>
            <td style="font-family: monospace; font-size:1.1rem">${item.qty} ${unit}</td>
            <td>${costStr}</td>
            <td>${statusTag}</td>
            <td style="display:flex; gap:6px; padding:0.75rem 0;">
                <button class="btn-action btn-adjust" title="Ajustar stock" onclick="openAdjustModal('${item.id}', '${item.name}', ${item.qty}, '${item.unit_cost || ''}', '${unit}')">
                    <i class="ph ph-pencil-simple"></i> Ajustar
                </button>
                <button class="btn-action btn-delete" title="Eliminar" onclick="removeQuimico('${item.id}')">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        </tr>`;
    });

    // 2. Render Cosechas
    const tbodyC = document.getElementById('cosechasTableBody');
    tbodyC.innerHTML = '';
    if (core_inventory.cosechas.length === 0) {
        tbodyC.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--text-secondary);">Sin cosechas registradas.</td></tr>`;
    }
    core_inventory.cosechas.forEach(item => {
        let originTag = item.type === 'cosecha_b2b'
            ? `<span class="badge" style="background:rgba(41,121,255,0.15); color:var(--color-blue); border:1px solid var(--color-blue);">Terceros (B2B)</span>`
            : `<span class="badge" style="background:rgba(0,230,118,0.1); color:var(--color-green); border:1px solid var(--color-green);">Cosecha Propia</span>`;
        let posStatusTag = item.qty > 0
            ? `<span class="badge" style="background:#040; color:#44ff44; border:1px solid #44ff44;">En Venta</span>`
            : `<span class="badge" style="background:#400; color:#ff4444; border:1px solid #ff4444;">Agotado</span>`;
        let priceTag = item.price ? '$' + parseFloat(item.price).toFixed(2) : '-';

        tbodyC.innerHTML += `
        <tr>
            <td style="padding: 0.75rem 0; font-weight: 600;">${item.name}<br><small style="color:var(--text-secondary)">(${item.id})</small></td>
            <td>${originTag}</td>
            <td style="font-family: monospace; font-size:1.1rem">${item.qty} g</td>
            <td style="color: var(--text-secondary);">${priceTag} (Total)</td>
            <td style="display:flex; gap:6px; align-items:center; padding:0.75rem 0;">
                ${posStatusTag}
                <button class="btn-action btn-delete" title="Eliminar" onclick="removeCosecha('${item.id}')">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        </tr>`;
    });
}



function openAdjustModal(id, name, currentQty, currentUnitCost, unit) {
    // Remove existing modal if any
    document.getElementById('adjustModal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'adjustModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);z-index:1000;display:flex;justify-content:center;align-items:center;';
    modal.innerHTML = `
        <div style="background:var(--bg-light, #1b2028);border:1px solid var(--border-color, #444);border-radius:12px;padding:2rem;width:400px;max-width:90vw;">
            <h3 style="margin-bottom:15px; font-weight:600;"><i class="ph ph-flask" style="color:var(--color-green)"></i> ${name}</h3>
            <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:1.5rem;"><strong style="color:white;">Stock actual:</strong> ${currentQty} ${unit}</p>
            
            <input type="hidden" id="adjustId" value="${id}">
            <div style="display:flex; gap:10px; margin-bottom:1.5rem;">
                <div style="flex:1;">
                    <label style="font-size:0.8rem;color:var(--text-secondary);display:block;margin-bottom:6px;">Nuevo valor de stock (${unit})</label>
                    <input type="number" id="adjustQtyInput" value="${currentQty}" min="0" step="0.1"
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
                <button type="button" class="btn btn-primary" style="flex:1;" onclick="confirmAdjust('${id}')">Guardar</button>
            </div>
        </div>
    `;
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

async function removeQuimico(id) {
    if (confirm('¿Eliminar este insumo del inventario por completo?')) {
        try {
            await window.sbClient.from('core_inventory_quimicos').delete().eq('id', id);
            await fetchInventory();
        } catch (e) {
            console.error(e);
            alert('Fallo al eliminar de Supabase.');
        }
    }
}

async function removeCosecha(id) {
    if (confirm('¿Eliminar esta cosecha del inventario?')) {
        try {
            await window.sbClient.from('core_inventory_cosechas').delete().eq('id', id);
            await fetchInventory();
        } catch (e) {
            console.error(e);
            alert('Fallo al eliminar de Supabase.');
        }
    }
}
