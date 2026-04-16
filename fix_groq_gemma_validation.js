const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

wf.nodes.forEach(n => {
    if (n.name === 'Groq (Gemma Fallback)' && n.parameters) {
        // Change from static string back to n8n expression to bypass UI validation dropdown list!
        n.parameters.model = "={{ 'gemma2-9b-it' }}";
        console.log('Fixed Fallback model name to expression to bypass n8n UI validation.');
    }
});

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Saved repair.');
