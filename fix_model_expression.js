const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

wf.nodes.forEach(n => {
    if (n.name === 'OpenRouter (Llama 3.3)' && n.parameters) {
        // Change from static string to n8n expression to bypass UI validation dropdown list
        n.parameters.model = "={{ 'meta-llama/llama-3.3-70b-instruct:free' }}";
        console.log('Fixed Llama 3.3 model name to expression');
    }
    if (n.name === 'OpenRouter (Gemini Flash)' && n.parameters) {
        n.parameters.model = "={{ 'google/gemini-2.5-flash:free' }}";
        console.log('Fixed Gemini Flash model name to expression');
    }
});

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Saved repair.');
