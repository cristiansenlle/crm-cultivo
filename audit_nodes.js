const fs = require('fs');

function auditWorkflow(filename) {
    if (!fs.existsSync(filename)) {
        console.log(`File ${filename} not found.`);
        return;
    }
    console.log(`\n--- Auditing ${filename} ---`);
    const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
    const nodes = JSON.parse(data.nodes);
    
    const types = {};
    const executeCommandNodes = [];
    
    nodes.forEach(n => {
        types[n.type] = (types[n.type] || 0) + 1;
        if (n.type.toLowerCase().includes('executecommand')) {
            executeCommandNodes.push({ name: n.name, type: n.type });
        }
    });
    
    console.log('Node Types found:');
    Object.keys(types).sort().forEach(t => console.log(` - ${t}: ${types[t]}`));
    
    if (executeCommandNodes.length > 0) {
        console.log('Execute Command Nodes:', executeCommandNodes);
    } else {
        console.log('No Execute Command nodes found.');
    }
}

auditWorkflow('scp_full_export.json');
// I need to fetch k2d properly first if I want to audit it too.
