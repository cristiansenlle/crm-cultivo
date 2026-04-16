const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

// Replace decommissioned gemma2-9b-it with llama-3.3-70b-versatile
// Also check the primary model is valid
wf.nodes.forEach(n => {
    if (n.type && n.type.includes('lmChatGroq')) {
        const oldModel = n.parameters.model;
        if (typeof n.parameters.model === 'string' && n.parameters.model.includes('gemma')) {
            n.parameters.model = 'llama-3.3-70b-versatile';
            console.log('Replaced model in node:', n.name, '|', oldModel, '->', n.parameters.model);
        } else {
            console.log('Kept model in node:', n.name, '|', n.parameters.model);
        }
    }
});

// Handle expression-based model names too
wf.nodes.forEach(n => {
    if (n.type && n.type.includes('lmChatGroq')) {
        // Check if model is an expression
        if (n.parameters.model && typeof n.parameters.model === 'object') {
            console.log('Expression model in:', n.name, JSON.stringify(n.parameters.model));
        }
    }
});

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Done.');
