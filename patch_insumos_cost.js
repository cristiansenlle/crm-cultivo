const fs = require('fs');

// Patch insumos.html
let html = fs.readFileSync('c:/Users/Cristian/.gemini/antigravity/crm cannabis/insumos.html', 'utf8');
html = html.replace(
`                                    <th>Stock Vigente</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>`,
`                                    <th>Stock Vigente</th>
                                    <th>Costo / Inversión</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>`);
fs.writeFileSync('c:/Users/Cristian/.gemini/antigravity/crm cannabis/insumos.html', html);

// Patch insumos.js
let js = fs.readFileSync('c:/Users/Cristian/.gemini/antigravity/crm cannabis/insumos.js', 'utf8');

// 1. Quimicos Insertion (Add unit_cost and core_sales OPEX logic)
js = js.replace(
`                await window.sbClient.from('core_inventory_quimicos').insert([{
                    name: name,
                    type: type,
                    qty: qty,
                    min_stock: 0
                }]);`,
`                const unit_cost = price > 0 ? (price / qty) : null;
                await window.sbClient.from('core_inventory_quimicos').insert([{
                    name: name,
                    type: type,
                    qty: qty,
                    min_stock: 0,
                    unit_cost: unit_cost
                }]);`);

// Core Sales OPEX Logic on handleIngreso
js = js.replace(
`        // Fetch de nuevo para actualizar UI
        await fetchInventory();`,
`        // Registrar gasto financiero en core_sales si hubo costo
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
        await fetchInventory();`);

// Render Cost column
js = js.replace(
`        tbodyQ.innerHTML += \`
        <tr>
            <td style="padding: 0.75rem 0; font-weight: 600;">\${item.name}</td>
            <td style="color: var(--text-secondary); text-transform: capitalize;">\${item.type}</td>
            <td style="font-family: monospace; font-size:1.1rem">\${item.qty} \${unit}</td>
            <td>\${statusTag}</td>
            <td style="display:flex; gap:6px; padding:0.75rem 0;">
                <button class="btn-action btn-adjust" title="Ajustar stock" onclick="openAdjustModal('\${item.id}', '\${item.name}', \${item.qty}, '\${unit}')">`,
`        const totalCost = item.unit_cost && item.qty > 0 ? (item.unit_cost * item.qty).toLocaleString('en-US',{minimumFractionDigits:2}) : 'N/A';
        const costStr = item.unit_cost ? \`<span style="color:var(--color-red);">$\${totalCost}</span> <br><small style="color:var(--text-secondary)">$\${item.unit_cost.toLocaleString('en-US',{minimumFractionDigits:2})}/\${unit}</small>\` : '<span style="color:var(--text-secondary)">-</span>';

        tbodyQ.innerHTML += \`
        <tr>
            <td style="padding: 0.75rem 0; font-weight: 600;">\${item.name}</td>
            <td style="color: var(--text-secondary); text-transform: capitalize;">\${item.type}</td>
            <td style="font-family: monospace; font-size:1.1rem">\${item.qty} \${unit}</td>
            <td>\${costStr}</td>
            <td>\${statusTag}</td>
            <td style="display:flex; gap:6px; padding:0.75rem 0;">
                <button class="btn-action btn-adjust" title="Ajustar stock" onclick="openAdjustModal('\${item.id}', '\${item.name}', \${item.qty}, '\${item.unit_cost}', '\${unit}')">`);

// Adjust modal params (need to update signature)
js = js.replace(
`function openAdjustModal(id, name, currentQty, unit) {`,
`function openAdjustModal(id, name, currentQty, currentUnitCost, unit) {`
);

// Adjust modal inputs
js = js.replace(
`            <label style="font-size:0.8rem;color:var(--text-secondary);display:block;margin-bottom:6px;">Nuevo valor de stock (\${unit})</label>
            <input type="number" id="adjustQtyInput" value="\${currentQty}" min="0" step="0.1"
                style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid #444;background:var(--bg-dark);color:white;font-size:1rem;margin-bottom:1.5rem;">
            <div style="display:flex;gap:10px;">`,
`            <div style="display:flex; gap:10px; margin-bottom:1.5rem;">
                <div style="flex:1;">
                    <label style="font-size:0.8rem;color:var(--text-secondary);display:block;margin-bottom:6px;">Nuevo valor de stock (\${unit})</label>
                    <input type="number" id="adjustQtyInput" value="\${currentQty}" min="0" step="0.1"
                        style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid #444;background:var(--bg-dark);color:white;font-size:1rem;">
                </div>
                <div style="flex:1;">
                    <label style="font-size:0.8rem;color:var(--text-secondary);display:block;margin-bottom:6px;">Corrección de Costo ($)</label>
                    <input type="number" id="adjustCostInput" placeholder="Sin cambios" min="0" step="0.01"
                        style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid #444;background:var(--bg-dark);color:white;font-size:1rem;">
                </div>
            </div>
            <p style="font-size:0.75rem; color:var(--text-secondary); margin-top:-10px; margin-bottom:15px; line-height:1.4;">
                <i class="ph ph-info" style="color:var(--color-blue)"></i> Si ingresas un Corrección de Costo, se inyectará una transacción de OPEX automática en Finanzas por la diferencia.
            </p>
            <div style="display:flex;gap:10px;">`
);


// Adjust Modal Confirm
js = js.replace(
`async function confirmAdjust(id) {
    const newQty = parseFloat(document.getElementById('adjustQtyInput').value);
    if (isNaN(newQty) || newQty < 0) { alert('Valor inválido'); return; }
    try {
        await window.sbClient.from('core_inventory_quimicos').update({ qty: newQty, last_updated: new Date().toISOString() }).eq('id', id);`,
`async function confirmAdjust(id) {
    const newQty = parseFloat(document.getElementById('adjustQtyInput').value);
    const newCostInput = document.getElementById('adjustCostInput').value;
    if (isNaN(newQty) || newQty < 0) { alert('Valor inválido'); return; }
    
    try {
        let updates = { qty: newQty, last_updated: new Date().toISOString() };
        
        if (newCostInput && !isNaN(parseFloat(newCostInput))) {
            const addedCost = parseFloat(newCostInput);
            if (addedCost > 0) {
                 // The old stock must be converted to new average unit_cost or just total value replacement.
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

        await window.sbClient.from('core_inventory_quimicos').update(updates).eq('id', id);`
);


fs.writeFileSync('c:/Users/Cristian/.gemini/antigravity/crm cannabis/insumos.js', js);
console.log('patched');
