const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

wf.nodes.forEach(n => {
    if (n.name === 'OpenRouter (Mistral Primary)') {
        n.type = '@n8n/n8n-nodes-langchain.lmChatOpenRouter';
        n.typeVersion = 1;
        n.parameters = {
            "model": "mistralai/mistral-small-3.1-24b-instruct:free",
            "options": {}
        };
        n.credentials = {
            "openRouterApi": {
                "id": "",
                "name": "OpenRouter API"
            }
        };
        console.log('Migrated Native OpenRouter Mistral');
    }
    if (n.name === 'OpenRouter (Gemma Fallback)') {
        n.type = '@n8n/n8n-nodes-langchain.lmChatOpenRouter';
        n.typeVersion = 1;
        n.parameters = {
            "model": "google/gemma-3-27b-it:free",
            "options": {}
        };
        n.credentials = {
            "openRouterApi": {
                "id": "",
                "name": "OpenRouter API"
            }
        };
        console.log('Migrated Native OpenRouter Gemma');
    }
});

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Saved repair.');
