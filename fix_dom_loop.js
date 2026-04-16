const fs = require('fs');

let js = fs.readFileSync('c:/Users/Cristian/.gemini/antigravity/crm cannabis/insumos.js', 'utf8');

// I will find the boundaries of the corrupted `renderInventory` and rewrite it
// The start is `function renderInventory() {`
// The end is the start of `async function removeQuimico(id) {`

const startTarget = 'function renderInventory() {';
const endTarget = 'async function removeQuimico(id) {';

const split1 = js.split(startTarget);
const split2 = split1[1].split(endTarget);

const correctRenderInventory = `
    // 1. Render Quimicos
    const tbodyQ = document.getElementById('quimicosTableBody');
    tbodyQ.innerHTML = '';
    if (core_inventory.quimicos.length === 0) {
        tbodyQ.innerHTML = \`<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--text-secondary);">Sin registros. Ingresá mercadería con el formulario.</td></tr>\`;
    }
    core_inventory.quimicos.forEach(item => {
        const unit = (TYPE_UNIT_MAP[item.type] || { unit: 'u' }).unit;
        let statusTag = '';
        if (item.qty <= 0) {
            statusTag = \`<span class="badge" style="background:#400; color:#ff4444; border:1px solid #ff4444;">Agotado</span>\`;
        } else if (item.qty < 500) {
            statusTag = \`<span class="badge" style="background:#440; color:#ffff44; border:1px solid #ffff44;">Bajo Stock</span>\`;
        } else {
            statusTag = \`<span class="badge" style="background:#040; color:#44ff44; border:1px solid #44ff44;">Óptimo</span>\`;
        }
        
        const totalCost = item.unit_cost && item.qty > 0 ? (item.unit_cost * item.qty).toLocaleString('en-US',{minimumFractionDigits:2}) : 'N/A';
        const costStr = item.unit_cost ? \`<span style="color:var(--color-red);">$&#36;{totalCost}</span> <br><small style="color:var(--text-secondary)">$&#36;{item.unit_cost.toLocaleString('en-US',{minimumFractionDigits:2})}/\${unit}</small>\` : '<span style="color:var(--text-secondary)">-</span>';

        tbodyQ.innerHTML += \`
        <tr>
            <td style="padding: 0.75rem 0; font-weight: 600;">\${item.name}</td>
            <td style="color: var(--text-secondary); text-transform: capitalize;">\${item.type}</td>
            <td style="font-family: monospace; font-size:1.1rem">\${item.qty} \${unit}</td>
            <td>\${costStr}</td>
            <td>\${statusTag}</td>
            <td style="display:flex; gap:6px; padding:0.75rem 0;">
                <button class="btn-action btn-adjust" title="Ajustar stock" onclick="openAdjustModal('\${item.id}', '\${item.name}', \${item.qty}, '\${item.unit_cost || ''}', '\${unit}')">
                    <i class="ph ph-pencil-simple"></i> Ajustar
                </button>
                <button class="btn-action btn-delete" title="Eliminar" onclick="removeQuimico('\${item.id}')">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        </tr>\`;
    });

    // 2. Render Cosechas
    const tbodyC = document.getElementById('cosechasTableBody');
    tbodyC.innerHTML = '';
    if (core_inventory.cosechas.length === 0) {
        tbodyC.innerHTML = \`<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--text-secondary);">Sin cosechas registradas.</td></tr>\`;
    }
    core_inventory.cosechas.forEach(item => {
        let originTag = item.type === 'cosecha_b2b'
            ? \`<span class="badge" style="background:rgba(41,121,255,0.15); color:var(--color-blue); border:1px solid var(--color-blue);">Terceros (B2B)</span>\`
            : \`<span class="badge" style="background:rgba(0,230,118,0.1); color:var(--color-green); border:1px solid var(--color-green);">Cosecha Propia</span>\`;
        let posStatusTag = item.qty > 0
            ? \`<span class="badge" style="background:#040; color:#44ff44; border:1px solid #44ff44;">En Venta</span>\`
            : \`<span class="badge" style="background:#400; color:#ff4444; border:1px solid #ff4444;">Agotado</span>\`;
        let priceTag = item.price ? '$' + parseFloat(item.price).toFixed(2) : '-';

        tbodyC.innerHTML += \`
        <tr>
            <td style="padding: 0.75rem 0; font-weight: 600;">\${item.name}<br><small style="color:var(--text-secondary)">(\${item.id})</small></td>
            <td>\${originTag}</td>
            <td style="font-family: monospace; font-size:1.1rem">\${item.qty} g</td>
            <td style="color: var(--text-secondary);">\${priceTag} (Total)</td>
            <td style="display:flex; gap:6px; align-items:center; padding:0.75rem 0;">
                \${posStatusTag}
                <button class="btn-action btn-delete" title="Eliminar" onclick="removeCosecha('\${item.id}')">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        </tr>\`;
    });
}
`;

// wait, the $ sign inside template string might break the dollar sign formatting
// I will just use \$
let finalJS = split1[0] + "\nfunction renderInventory() {\n" + correctRenderInventory.replace(/&#36;/g, "$") + "\n" + endTarget + split2[1];

fs.writeFileSync('c:/Users/Cristian/.gemini/antigravity/crm cannabis/insumos.js', finalJS);
console.log("Fixed DOM Loop in insumos.js");
