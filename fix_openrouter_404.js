const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

wf.nodes.forEach(n => {
    if (n.name === 'OpenRouter (Gemini Flash)' && n.parameters) {
        // Change from the non-existent gemini model to a verified free OpenRouter model
        n.parameters.model = "={{ 'mistralai/mistral-small-3.1-24b-instruct:free' }}";
        n.name = 'OpenRouter (Mistral Small)';
        console.log('Fixed secondary model to Mistral');
    }
});

// Repair connections if name changed
if (wf.connections['OpenRouter (Gemini Flash)']) {
    wf.connections['OpenRouter (Mistral Small)'] = wf.connections['OpenRouter (Gemini Flash)'];
    delete wf.connections['OpenRouter (Gemini Flash)'];
}

for (const [nodeName, nodeConns] of Object.entries(wf.connections)) {
    for (const [outputName, outputs] of Object.entries(nodeConns)) {
        outputs.forEach(outputsArray => {
            outputsArray.forEach(conn => {
                if (conn.node === 'OpenRouter (Gemini Flash)') {
                    conn.node = 'OpenRouter (Mistral Small)';
                }
            });
        });
    }
}

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Saved repair.');
