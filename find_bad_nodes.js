const fs = require('fs');

try {
    const raw = fs.readFileSync('latest_export.json', 'utf8');
    const data = JSON.parse(raw);
    const wf = Array.isArray(data) ? data[0] : (data['0'] || data);

    let nodesStr = '';
    if (wf.nodes && wf.nodes.type === 'Buffer' && wf.nodes.data) {
        nodesStr = Buffer.from(wf.nodes.data).toString('utf8');
    } else {
        nodesStr = JSON.stringify(wf.nodes);
    }

    const nodes = JSON.parse(nodesStr);

    for (const n of nodes) {
        const str = JSON.stringify(n).toLowerCase();
        if (str.includes('sala 1') || str.includes('2500') || str.includes('sala-veg')) {
            console.log("\\n=== FOUND IN NODE ===");
            console.log("Name:", n.name);
            console.log("Type:", n.type);

            if (n.parameters) {
                if (n.parameters.description && n.parameters.description.toLowerCase().includes('sala')) {
                    console.log("-> Description contains 'sala'");
                    console.log(n.parameters.description);
                }
                if (n.parameters.description && n.parameters.description.includes('2500')) {
                    console.log("-> Description contains '2500'");
                }
                if (n.parameters.options && n.parameters.options.systemMessage) {
                    const sm = n.parameters.options.systemMessage.toLowerCase();
                    if (sm.includes('sala') || sm.includes('2500')) {
                        console.log("-> System Message contains 'sala' or '2500'!");
                        console.log(n.parameters.options.systemMessage.substring(0, 500) + '...');
                    }
                }
            }
        }
    }

} catch (e) {
    console.error("Error:", e.message);
}
