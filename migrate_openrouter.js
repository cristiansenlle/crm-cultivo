const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

wf.nodes.forEach(n => {
    if (n.name === 'Gemini Chat Model') {
        n.type = '@n8n/n8n-nodes-langchain.lmChatOpenAi';
        n.typeVersion = 1;
        n.name = 'OpenRouter (Llama 3.3)';
        n.parameters = {
            "model": "meta-llama/llama-3.3-70b-instruct:free",
            "options": {
                "baseURL": "https://openrouter.ai/api/v1"
            }
        };
        // Remove old credentials
        n.credentials = {
            "openAiApi": {
                "id": "",
                "name": "OpenRouter API"
            }
        };
        console.log('Migrated Gemini to OpenRouter (Llama 3.3)');
    }

    if (n.name === 'Groq LLM') {
        n.type = '@n8n/n8n-nodes-langchain.lmChatOpenAi';
        n.typeVersion = 1;
        n.name = 'OpenRouter (Gemini Flash)';
        n.parameters = {
            "model": "google/gemini-2.5-flash:free",
            "options": {
                "baseURL": "https://openrouter.ai/api/v1"
            }
        };
        n.credentials = {
            "openAiApi": {
                "id": "",
                "name": "OpenRouter API"
            }
        };
        console.log('Migrated Groq to OpenRouter (Gemini Flash)');
    }
});

// Update connection keys safely
if (wf.connections['Gemini Chat Model']) {
    wf.connections['OpenRouter (Llama 3.3)'] = wf.connections['Gemini Chat Model'];
    delete wf.connections['Gemini Chat Model'];
}

if (wf.connections['Groq LLM']) {
    wf.connections['OpenRouter (Gemini Flash)'] = wf.connections['Groq LLM'];
    delete wf.connections['Groq LLM'];
}

// Any node pointing TO Gemini Chat Model or Groq LLM needs updating
for (const [nodeName, nodeConns] of Object.entries(wf.connections)) {
    for (const [outputName, outputs] of Object.entries(nodeConns)) {
        outputs.forEach(outputsArray => {
            outputsArray.forEach(conn => {
                if (conn.node === 'Gemini Chat Model') conn.node = 'OpenRouter (Llama 3.3)';
                if (conn.node === 'Groq LLM') conn.node = 'OpenRouter (Gemini Flash)';
            });
        });
    }
}

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Saved workflow with OpenRouter nodes.');
