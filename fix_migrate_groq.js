const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

wf.nodes.forEach(n => {
    if (n.name === 'OpenRouter (Mistral Primary)') {
        n.type = '@n8n/n8n-nodes-langchain.lmChatGroq';
        n.typeVersion = 1;
        n.name = 'Groq (Llama 8B Instant)';
        n.parameters = {
            "model": "llama-3.1-8b-instant",
            "options": {}
        };
        n.credentials = {
            "groqApi": {
                "id": "",
                "name": "Groq API"
            }
        };
        console.log('Migrated primary back to Groq');
    }
});

if (wf.connections['OpenRouter (Mistral Primary)']) {
    wf.connections['Groq (Llama 8B Instant)'] = wf.connections['OpenRouter (Mistral Primary)'];
    delete wf.connections['OpenRouter (Mistral Primary)'];
}

for (const [nodeName, nodeConns] of Object.entries(wf.connections)) {
    for (const [outputName, outputs] of Object.entries(nodeConns)) {
        outputs.forEach(outputsArray => {
            outputsArray.forEach(conn => {
                if (conn.node === 'OpenRouter (Mistral Primary)') {
                    conn.node = 'Groq (Llama 8B Instant)';
                }
            });
        });
    }
}

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Saved repair.');
