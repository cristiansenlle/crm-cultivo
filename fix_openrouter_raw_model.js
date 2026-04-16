const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

wf.nodes.forEach(n => {
    if (n.name === 'OpenRouter (Mistral Primary)' && n.parameters) {
        // Since we changed credential to Custom API, n8n doesn't do UI validation,
        // so we don't need expressions anymore. The expression was probably passing literally as string.
        n.parameters.model = "mistralai/mistral-small-3.1-24b-instruct:free";
        console.log('Fixed primary model to raw string');
    }
    if (n.name === 'OpenRouter (Gemma Fallback)' && n.parameters) {
        n.parameters.model = "google/gemma-3-27b-it:free";
        console.log('Fixed secondary model to raw string');
    }
});

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Saved repair.');
