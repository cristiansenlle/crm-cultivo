const fs = require('fs');

let js = fs.readFileSync('c:/Users/Cristian/.gemini/antigravity/crm cannabis/analytics.js', 'utf8');

if (!js.includes('isOpex')) {
    const tableRegex = /<td style="color:var\(--color-green\);">\+\$\$\{parseFloat\(sale\.revenue\)\.toFixed\(2\)\}<\/td>/g;
    
    // We replace the entire tr construction block
    const htmlBlockRegex = /html \+= \`[\s\S]*?<tr style="border-bottom: 1px solid var\(--border-color\);">[\s\S]*?<td style="padding:10px; font-family:monospace; font-size:0\.85rem">\$\{sale\.tx_id\}<\/td>[\s\S]*?<td style="color:var\(--text-muted\);">\$\{dateStr\}<\/td>[\s\S]*?<td style="text-transform: capitalize;">\$\{clientLabel\}<\/td>[\s\S]*?<td><strong>\$\{sale\.item_id\}<\/strong><\/td>[\s\S]*?<td style="font-family:monospace;">\$\{sale\.qty_sold\}g<\/td>[\s\S]*?<td style="color:var\(--color-green\);">\+\$\$\{parseFloat\(sale\.revenue\)\.toFixed\(2\)\}<\/td>[\s\S]*?<\/tr>[\s\S]*?\`;/g;

    const newHtmlBlock = `const isOpex = sale.tx_id && sale.tx_id.startsWith('OPEX');
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
                <td style="color:\${color}; font-weight:600;">\${sign}$\${amount}</td>
            </tr>
            \`;`;
            
    js = js.replace(htmlBlockRegex, newHtmlBlock);
    
    // Patch CSV Exporter
    const csvRegex = /csvContent \+= \`"\$\{sale\.tx_id\}","\$\{dateStr\}","\$\{clientLabel\}","\$\{sale\.item_id\}",\$\{sale\.qty_sold\},\$\{parseFloat\(sale\.revenue\)\.toFixed\(2\)\}\\n\`;/g;
    const newCsv = `const isOpex = sale.tx_id && sale.tx_id.startsWith('OPEX-');
        const rev = isOpex ? -Math.abs(parseFloat(sale.cost_of_goods)) : parseFloat(sale.revenue);
        csvContent += \`"\${sale.tx_id}","\${dateStr}","\${clientLabel}","\${sale.item_id}",\${sale.qty_sold},\${rev.toFixed(2)}\\n\`;`;
        
    js = js.replace(csvRegex, newCsv);

    fs.writeFileSync('c:/Users/Cristian/.gemini/antigravity/crm cannabis/analytics.js', js);
    console.log("Analytics patched successfully!");
} else {
    console.log("Analytics ALREADY patched!");
}
