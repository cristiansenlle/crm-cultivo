const fs = require('fs');

// Patch HTML
let html = fs.readFileSync('c:/Users/Cristian/.gemini/antigravity/crm cannabis/insumos.html', 'utf8');
let htmlParts = html.split('<th>Stock Vigente</th>');
if (htmlParts.length > 1) {
    // Only replace the first occurrence (quimicos table)
    html = htmlParts[0] + '<th>Stock Vigente</th>\n                                    <th>Costo / Inversión</th>' + htmlParts.slice(1).join('<th>Stock Vigente</th>');
    fs.writeFileSync('c:/Users/Cristian/.gemini/antigravity/crm cannabis/insumos.html', html);
    console.log("HTML Patched!");
} else {
    console.log("HTML already patched or anchor missing!");
}

// Patch insumos.js
let js = fs.readFileSync('c:/Users/Cristian/.gemini/antigravity/crm cannabis/insumos.js', 'utf8');

// 1. Quimicos Insertion (Add unit_cost and core_sales OPEX logic)
js = js.replace(/await window\.sbClient\.from\('core_inventory_quimicos'\)\.insert\(\[\{\s*name:\s*name,\s*type:\s*type,\s*qty:\s*qty,\s*min_stock:\s*0\s*\}\]\);/g,
    "const unit_cost = price > 0 ? (price / qty) : null;\n                await window.sbClient.from('core_inventory_quimicos').insert([{\n                    name: name,\n                    type: type,\n                    qty: qty,\n                    min_stock: 0,\n                    unit_cost: unit_cost\n                }]);"
);

// 2. Core Sales OPEX Logic on handleIngreso
if (!js.includes("OPEX-BODEGA-")) {
    js = js.replace(/\/\/ Fetch de nuevo para actualizar UI\s*await fetchInventory\(\);/g,
        "// Registrar gasto financiero\n        if (price > 0) {\n            await window.sbClient.from('core_sales').insert([{\n                tx_id: 'OPEX-BODEGA-' + Date.now(),\n                date: new Date().toISOString(),\n                item_id: 'Compra: ' + name,\n                qty_sold: qty,\n                revenue: 0,\n                cost_of_goods: price,\n                client: 'proveedor_opex'\n            }]);\n        }\n\n        // Fetch de nuevo para actualizar UI\n        await fetchInventory();"
    );
}

// 3. Render Cost column
if (!js.includes("item.unit_cost")) {
    // We target the table row rendering
    const trRegex = /<tr>\s*<td style="padding: 0\.75rem 0; font-weight: 600;">\$\{item\.name\}<\/td>\s*<td style="color: var\(--text-secondary\); text-transform: capitalize;">\$\{item\.type\}<\/td>\s*<td style="font-family: monospace; font-size:1\.1rem">\$\{item\.qty\} \$\{unit\}<\/td>\s*<td>\$\{statusTag\}<\/td>\s*<td style="display:flex; gap:6px; padding:0\.75rem 0;">\s*<button class="btn-action btn-adjust" title="Ajustar stock" onclick="openAdjustModal\('\$\{item\.id\}', '\$\{item\.name\}', \$\{item\.qty\}, '\$\{unit\}'\)">/g;
    
    const replacementStr = `const totalCost = item.unit_cost && item.qty > 0 ? (item.unit_cost * item.qty).toLocaleString('en-US',{minimumFractionDigits:2}) : 'N/A';
        const costStr = item.unit_cost ? \`<span style="color:var(--color-red);">$\${totalCost}</span> <br><small style="color:var(--text-secondary)">$\${item.unit_cost.toLocaleString('en-US',{minimumFractionDigits:2})}/\${unit}</small>\` : '<span style="color:var(--text-secondary)">-</span>';

        tbodyQ.innerHTML += \`
        <tr>
            <td style="padding: 0.75rem 0; font-weight: 600;">\${item.name}</td>
            <td style="color: var(--text-secondary); text-transform: capitalize;">\${item.type}</td>
            <td style="font-family: monospace; font-size:1.1rem">\${item.qty} \${unit}</td>
            <td>\${costStr}</td>
            <td>\${statusTag}</td>
            <td style="display:flex; gap:6px; padding:0.75rem 0;">
                <button class="btn-action btn-adjust" title="Ajustar stock" onclick="openAdjustModal('\${item.id}', '\${item.name}', \${item.qty}, '\${item.unit_cost || ''}', '\${unit}')">`;
                
    js = js.replace(trRegex, replacementStr);
}

// 4. Adjust modal params
if (!js.includes("currentUnitCost")) {
    js = js.replace(/function openAdjustModal\(id, name, currentQty, unit\) \{/g, "function openAdjustModal(id, name, currentQty, currentUnitCost, unit) {");
}

// 5. Adjust modal inputs
if (!js.includes("adjustCostInput")) {
    const inputRegex = /<label style="font-size:0\.8rem;color:var\(--text-secondary\);display:block;margin-bottom:6px;">Nuevo valor de stock \(\$\{unit\}\)<\/label>\s*<input type="number" id="adjustQtyInput" value="\$\{currentQty\}" min="0" step="0\.1"\s*style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid #444;background:var\(--bg-dark\);color:white;font-size:1rem;margin-bottom:1\.5rem;">/g;
    
    const inputReplacement = `<div style="display:flex; gap:10px; margin-bottom:1.5rem;">
                <div style="flex:1;">
                    <label style="font-size:0.8rem;color:var(--text-secondary);display:block;margin-bottom:6px;">Nuevo valor de stock (\${unit})</label>
                    <input type="number" id="adjustQtyInput" value="\${currentQty}" min="0" step="0.1"
                        style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid #444;background:var(--bg-dark);color:white;font-size:1rem;">
                </div>
                <div style="flex:1;">
                    <label style="font-size:0.8rem;color:var(--text-secondary);display:block;margin-bottom:6px;">Corrección Costo ($)</label>
                    <input type="number" id="adjustCostInput" placeholder="Dif. Gasto" step="0.01"
                        style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid #444;background:var(--bg-dark);color:white;font-size:1rem;">
                </div>
            </div>`;
    js = js.replace(inputRegex, inputReplacement);
}

// 6. Adjust Modal Confirm
if (!js.includes("newCostInput")) {
    const confirmRegex = /async function confirmAdjust\(id\) \{\s*const newQty = parseFloat\(document\.getElementById\('adjustQtyInput'\)\.value\);\s*if \(isNaN\(newQty\) \|\| newQty < 0\) \{ alert\('Valor inválido'\); return; \}\s*try \{\s*await window\.sbClient\.from\('core_inventory_quimicos'\)\.update\(\{ qty: newQty, last_updated: new Date\(\)\.toISOString\(\) \}\)\.eq\('id', id\);/g;
    
    const confirmReplacement = `async function confirmAdjust(id) {
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
        await window.sbClient.from('core_inventory_quimicos').update(updates).eq('id', id);`;
        
    js = js.replace(confirmRegex, confirmReplacement);
}

fs.writeFileSync('c:/Users/Cristian/.gemini/antigravity/crm cannabis/insumos.js', js);
console.log("JS Patched!");
