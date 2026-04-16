const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

wf.nodes.forEach(n => {
    if (n.name === 'OpenRouter (Llama 3.3)' && n.parameters) {
        // Change from heavy 70b llama to lightweight but highly capable mistral-small
        n.parameters.model = "={{ 'mistralai/mistral-small-3.1-24b-instruct:free' }}";
        n.name = 'OpenRouter (Mistral Primary)';
        console.log('Fixed primary model to Mistral');
    }
    if (n.name === 'OpenRouter (Mistral Small)' && n.parameters) {
        // Change fallback to Google's open gemma-3 27b
        n.parameters.model = "={{ 'google/gemma-3-27b-it:free' }}";
        n.name = 'OpenRouter (Gemma Fallback)';
        console.log('Fixed secondary model to Gemma');
    }
});

// Repair connections if name changed
if (wf.connections['OpenRouter (Llama 3.3)']) {
    wf.connections['OpenRouter (Mistral Primary)'] = wf.connections['OpenRouter (Llama 3.3)'];
    delete wf.connections['OpenRouter (Llama 3.3)'];
}
if (wf.connections['OpenRouter (Mistral Small)']) {
    wf.connections['OpenRouter (Gemma Fallback)'] = wf.connections['OpenRouter (Mistral Small)'];
    delete wf.connections['OpenRouter (Mistral Small)'];
}

for (const [nodeName, nodeConns] of Object.entries(wf.connections)) {
    for (const [outputName, outputs] of Object.entries(nodeConns)) {
        outputs.forEach(outputsArray => {
            outputsArray.forEach(conn => {
                if (conn.node === 'OpenRouter (Llama 3.3)') {
                    conn.node = 'OpenRouter (Mistral Primary)';
                }
                if (conn.node === 'OpenRouter (Mistral Small)') {
                    conn.node = 'OpenRouter (Gemma Fallback)';
                }
            });
        });
    }
}

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Saved repair.');
