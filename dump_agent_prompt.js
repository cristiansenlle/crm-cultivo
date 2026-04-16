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
        if (n.type === '@n8n/n8n-nodes-langchain.agent') {
            if (n.parameters && n.parameters.options && n.parameters.options.systemMessage) {
                console.log(`=== PROMPT FOR: ${n.name} ===`);
                console.log(n.parameters.options.systemMessage);
                console.log("\\n==========================================\\n");
            }
        }
    }

} catch (e) {
    console.error("Error:", e.message);
}
