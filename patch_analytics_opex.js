const fs = require('fs');
let js = fs.readFileSync('c:/Users/Cristian/.gemini/antigravity/crm cannabis/analytics.js', 'utf8');

js = js.replace(
`            html += \`
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding:10px; font-family:monospace; font-size:0.85rem">\${sale.tx_id}</td>
                <td style="color:var(--text-muted);">\${dateStr}</td>
                <td style="text-transform: capitalize;">\${clientLabel}</td>
                <td><strong>\${sale.item_id}</strong></td>
                <td style="font-family:monospace;">\${sale.qty_sold}g</td>
                <td style="color:var(--color-green);">+\$\${parseFloat(sale.revenue).toFixed(2)}</td>
            </tr>
            \`;`,
`            const isOpex = sale.tx_id && sale.tx_id.startsWith('OPEX');
            const color = isOpex ? "var(--color-red)" : "var(--color-green)";
            const sign = isOpex ? "-" : "+";
            const amount = isOpex ? parseFloat(sale.cost_of_goods).toFixed(2) : parseFloat(sale.revenue).toFixed(2);
            const qtyStr = isOpex ? '-' : \`\${sale.qty_sold}g\`;
            const clientOut = isOpex ? '<i class="ph ph-shopping-bag" style="color:var(--color-red)"></i> Proveedor / Compra' : clientLabel;

            html += \`
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding:10px; font-family:monospace; font-size:0.85rem">\${sale.tx_id}</td>
                <td style="color:var(--text-muted);">\${dateStr}</td>
                <td style="text-transform: capitalize;">\${clientOut}</td>
                <td><strong>\${sale.item_id}</strong></td>
                <td style="font-family:monospace;">\${qtyStr}</td>
                <td style="color:\${color}; font-weight:600;">\${sign}\$\${amount}</td>
            </tr>
            \`;`
);

// We should also patch the CSV Export for tx history so it respects Opex
js = js.replace(
`        csvContent += \`"\${sale.tx_id}","\${dateStr}","\${clientLabel}","\${sale.item_id}",\${sale.qty_sold},\${parseFloat(sale.revenue).toFixed(2)}\\n\`;`,
`        const isOpex = sale.tx_id && sale.tx_id.startsWith('OPEX-');
        const rev = isOpex ? -Math.abs(parseFloat(sale.cost_of_goods)) : parseFloat(sale.revenue);
        csvContent += \`"\${sale.tx_id}","\${dateStr}","\${clientLabel}","\${sale.item_id}",\${sale.qty_sold},\${rev.toFixed(2)}\\n\`;`
);

fs.writeFileSync('c:/Users/Cristian/.gemini/antigravity/crm cannabis/analytics.js', js);
console.log('patched_analytics');
