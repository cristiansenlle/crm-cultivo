const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

wf.nodes.forEach(n => {
    if (n.name === 'OpenRouter (Gemma Fallback)') {
        // Convert the fallback to Groq using Mixtral which is highly capable and has generous limits too
        n.type = '@n8n/n8n-nodes-langchain.lmChatGroq';
        n.typeVersion = 1;
        n.name = 'Groq (Mixtral Fallback)';
        n.parameters = {
            "model": "mixtral-8x7b-32768",
            "options": {}
        };
        n.credentials = {
            "groqApi": {
                "id": "",
                "name": "Groq API"
            }
        };
        console.log('Migrated fallback to Groq Mixtral');
    }
});

if (wf.connections['OpenRouter (Gemma Fallback)']) {
    wf.connections['Groq (Mixtral Fallback)'] = wf.connections['OpenRouter (Gemma Fallback)'];
    delete wf.connections['OpenRouter (Gemma Fallback)'];
}

for (const [nodeName, nodeConns] of Object.entries(wf.connections)) {
    for (const [outputName, outputs] of Object.entries(nodeConns)) {
        outputs.forEach(outputsArray => {
            outputsArray.forEach(conn => {
                if (conn.node === 'OpenRouter (Gemma Fallback)') {
                    conn.node = 'Groq (Mixtral Fallback)';
                }
            });
        });
    }
}

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Saved repair.');
