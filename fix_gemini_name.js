const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

wf.nodes.forEach(n => {
    if (n.name === 'Google Gemini Chat Model') {
        n.type = '@n8n/n8n-nodes-langchain.lmChatOpenAi';
        n.typeVersion = 1;
        n.name = 'OpenRouter (Llama 3.3)';
        n.parameters = {
            "model": "meta-llama/llama-3.3-70b-instruct:free",
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
        console.log('Migrated Google Gemini to OpenRouter (Llama 3.3)');
    }
});

// Repair connections
if (wf.connections['Google Gemini Chat Model']) {
    wf.connections['OpenRouter (Llama 3.3)'] = wf.connections['Google Gemini Chat Model'];
    delete wf.connections['Google Gemini Chat Model'];
}

// Any node pointing TO Google Gemini Chat Model needs updating
for (const [nodeName, nodeConns] of Object.entries(wf.connections)) {
    for (const [outputName, outputs] of Object.entries(nodeConns)) {
        outputs.forEach(outputsArray => {
            outputsArray.forEach(conn => {
                if (conn.node === 'Google Gemini Chat Model') {
                    conn.node = 'OpenRouter (Llama 3.3)';
                }
            });
        });
    }
}

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Saved repair.');
