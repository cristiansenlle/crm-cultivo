const fs = require('fs');
let txt = fs.readFileSync('c:/Users/Cristian/.gemini/antigravity/crm cannabis/cultivo.js', 'utf8');

// Replace Nutrition
txt = txt.replace(
`        await window.sbClient.from('core_agronomic_events').insert([{
            batch_id: batchId,
            event_type: 'nutricion',
            product_id: prodId || null,
            amount_applied: prodId ? qty : null,
            details: { ec_ph, vol, product_name: prodId ? nutritionProducts.find(p => p.id === prodId)?.name : 'Sólo Agua' }
        }]);`,
`        const prodName = prodId ? nutritionProducts.find(p => p.id === prodId)?.name : 'Sólo Agua';
        const descriptionStr = \`Riego/Nutrición: \${prodName} | Cantidad: \${prodId ? qty + 'mL' : 'N/A'} | EC/pH: \${ec_ph || 'N/A'} | Vol/Planta: \${vol || 'N/A'}\`;

        await window.sbClient.from('core_agronomic_events').insert([{
            batch_id: batchId,
            event_type: 'Riego',
            description: descriptionStr
        }]);`
);

// Replace IPM
txt = txt.replace(
`        await window.sbClient.from('core_agronomic_events').insert([{
            batch_id: batchId,
            event_type: 'ipm',
            product_id: prodId || null,
            amount_applied: prodId ? qty : null,
            details: { product_name: prodName }
        }]);`,
`        const descriptionStr = \`Prevención Plagas (IPM): \${prodName} | Cantidad Aplicada: \${prodId ? qty + 'mL/g' : 'N/A'}\`;

        await window.sbClient.from('core_agronomic_events').insert([{
            batch_id: batchId,
            event_type: 'Plaga',
            description: descriptionStr
        }]);`
);

// Replace Pruning
txt = txt.replace(
`        await window.sbClient.from('core_agronomic_events').insert([{
            batch_id: batchId,
            event_type: 'poda',
            details: { prune_type: type }
        }]);`,
`        const descriptionStr = \`Biometría/Podas: \${type}\`;

        await window.sbClient.from('core_agronomic_events').insert([{
            batch_id: batchId,
            event_type: 'Fase',
            description: descriptionStr
        }]);`
);

fs.writeFileSync('c:/Users/Cristian/.gemini/antigravity/crm cannabis/cultivo.js', txt);
console.log("cultivo.js patched successfully.");
