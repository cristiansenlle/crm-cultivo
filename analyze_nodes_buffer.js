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

    // Check if the hallucinated strings are anywhere in the nodes string!
    console.log("Nodes String Length:", nodesStr.length);
    console.log("Contains 'sala 1':", nodesStr.toLowerCase().includes('sala 1'));
    console.log("Contains 'sala-veg':", nodesStr.toLowerCase().includes('sala-veg'));
    console.log("Contains '2500':", nodesStr.includes('2500'));
    console.log("Contains '11111111':", nodesStr.includes('11111111'));

    const nodes = JSON.parse(nodesStr);

    // Check HTTP Nodes for URLs and Credentials
    const httpNodes = nodes.filter(n => n.type === 'n8n-nodes-base.httpRequest');
    console.log("\\n--- HTTP Nodes ---");
    const uniqueUrls = new Set();
    const uniqueCreds = new Set();

    for (const n of httpNodes) {
        if (n.parameters && n.parameters.url) uniqueUrls.add(n.parameters.url);
        if (n.credentials) {
            Object.values(n.credentials).forEach(c => uniqueCreds.add(c.id || c));
        }
    }
    console.log("URLs:", Array.from(uniqueUrls));
    console.log("Credentials:", Array.from(uniqueCreds));

} catch (e) {
    console.error("Error:", e.message);
}
