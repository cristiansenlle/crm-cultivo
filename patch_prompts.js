const fs = require('fs');

try {
    const raw = fs.readFileSync('latest_export.json', 'utf8');
    const data = JSON.parse(raw);
    const wfWrapper = Array.isArray(data) ? data[0] : (data['0'] || data);

    // N8N sometimes wraps nodes in a Buffer
    let nodesRaw;
    let isBuffer = false;
    if (wfWrapper.nodes && wfWrapper.nodes.type === 'Buffer' && wfWrapper.nodes.data) {
        nodesRaw = JSON.parse(Buffer.from(wfWrapper.nodes.data).toString('utf8'));
        isBuffer = true;
    } else {
        nodesRaw = wfWrapper.nodes;
    }

    let modifiedCount = 0;

    for (const node of nodesRaw) {
        if (node.type === '@n8n/n8n-nodes-langchain.agent' && node.parameters?.options?.systemMessage) {
            let sm = node.parameters.options.systemMessage;

            // 1. Fix Anti-Crash section
            sm = sm.replace(/Trips sala 1/g, 'Trips [nombre_sala]');
            sm = sm.replace(/A qué lote te referís de la sala 1/g, 'A qué lote te referís de la [sala_proporcionada]');

            // 2. Fix Ventas calculation example
            sm = sm.replace(/30g × \$7500\/g → revenue = 225000/g, '[X]g × $[Y]/g → revenue = [X*Y]');

            // 3. Fix Dialog Example completely
            sm = sm.replace(/sala-veg-1/g, '[identificador_de_sala_real]');
            sm = sm.replace(/sala-flo-1/g, '[otra_sala]');
            sm = sm.replace(/veg 1/g, '[nombre_sala_corto]');
            sm = sm.replace(/LOTE-A01/g, '[ID_DEL_LOTE_DEVUELTO_POR_BD]');

            // Extra: ensure 'sala 1' is completely gone
            sm = sm.replace(/sala 1/gi, '[sala_proporcionada]');
            sm = sm.replace(/lote 1/gi, '[lote_proporcionado]');

            // Update node
            node.parameters.options.systemMessage = sm;
            modifiedCount++;
            console.log(`Patched systemMessage for node: ${node.name}`);
        }
    }

    // Repackage nodes back into the wrapper as standard Array
    wfWrapper.nodes = nodesRaw;

    // Construct final JSON
    let finalOutput;
    if (Array.isArray(data)) {
        data[0] = wfWrapper;
        finalOutput = data;
    } else if (data['0']) {
        data['0'] = wfWrapper;
        finalOutput = data;
    } else {
        finalOutput = [wfWrapper]; // n8n import usually expects an array of workflows
    }

    fs.writeFileSync('patched_export.json', JSON.stringify(finalOutput, null, 2));
    console.log(`\\nSuccess: Patched ${modifiedCount} agent nodes and saved to patched_export.json!`);

} catch (e) {
    console.error("Error patching workflow:", e);
}
