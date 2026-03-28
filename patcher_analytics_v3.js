const fs = require('fs');
let js = fs.readFileSync('c:/Users/Cristian/.gemini/antigravity/crm cannabis/analytics.js', 'utf8');

const anchorA = '        visibleTxs.forEach(sale => {';
const anchorB = '        tbody.innerHTML = html;';

const parts = js.split(anchorA);
const partsB = parts[1].split(anchorB);

const newBody = `
            const d = new Date(sale.date);
            const dateStr = d.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) + ' ' + d.toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' });

            let clientLabel = sale.client || 'General';
            if (sale.client === 'walk_in' && sale.customer_name && sale.customer_name !== 'Consumidor Final') {
                clientLabel = \`Casual (\${sale.customer_name})\`;
            } else if (sale.client === 'walk_in') {
                clientLabel = 'Casual (Consumidor Final)';
            } else if (sale.client === 'vip_1') {
                clientLabel = 'VIP (John Doe)';
            } else if (sale.client === 'wholesale_1') {
                clientLabel = 'Mayorista (Dispensario X)';
            }

            const isOpex = sale.tx_id && sale.tx_id.startsWith('OPEX');
            const color = isOpex ? "var(--color-red)" : "var(--color-green)";
            const sign = isOpex ? "-" : "+";
            const amount = isOpex ? parseFloat(sale.cost_of_goods).toFixed(2) : parseFloat(sale.revenue).toFixed(2);
            const qtyStr = isOpex ? '-' : \`\${sale.qty_sold}g\`;
            const clientOut = isOpex ? '<i class="ph ph-shopping-bag" style="color:var(--color-red)"></i> ' + clientLabel : clientLabel;

            html += \`
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding:10px; font-family:monospace; font-size:0.85rem">\${sale.tx_id}</td>
                <td style="color:var(--text-muted);">\${dateStr}</td>
                <td style="text-transform: capitalize;">\${clientOut}</td>
                <td><strong>\${sale.item_id}</strong></td>
                <td style="font-family:monospace;">\${qtyStr}</td>
                <td style="color:\${color}; font-weight:600;">\${sign}$\${amount}</td>
            </tr>
            \`;
        });
`;

js = parts[0] + anchorA + newBody + anchorB + partsB[1];
fs.writeFileSync('c:/Users/Cristian/.gemini/antigravity/crm cannabis/analytics.js', js);
console.log('Done replacing block in analytics.js');
