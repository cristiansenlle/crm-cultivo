const fs = require('fs');

const data = JSON.parse(fs.readFileSync('n8n-crm-cannabis-workflow-FIXED.json', 'utf8'));

let found = false;
data.nodes.forEach(n => {
    if (n.name.toLowerCase().includes('lote') || n.name.toLowerCase().includes('batch')) {
        console.log("----- NODE:", n.name, "-----");
        console.log(JSON.stringify(n, null, 2));
        found = true;
    }
});

if (!found) console.log("No tool found with 'lote' or 'batch' in its name.");
