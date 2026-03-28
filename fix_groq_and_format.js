const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

// Fix Groq model to 8b-instant which has a much higher rate limit
const g = wf.nodes.find(n => n.name === 'Groq LLM');
if (g) {
    g.parameters.model = 'llama-3.1-8b-instant';
    console.log('Changed Groq model to llama-3.1-8b-instant');
}

// Check Format WA Response node script
const fmt = wf.nodes.find(n => n.name === 'Format WA Response');
if (fmt) {
    // Update it to handle errors explicitly
    fmt.parameters.jsCode = `
const item = $input.first().json;
let outputtext = '';

if (item.error) {
    outputtext = 'Error interno del modelo de IA: ' + (item.error.message || JSON.stringify(item.error));
} else {
    outputtext = item.output || item.text || item.response || (item.generations && item.generations[0] && item.generations[0][0] && item.generations[0][0].text);
}

if (!outputtext) {
    outputtext = 'Estructura de salida vacía devuelta por el modelo. Data recibida: ' + JSON.stringify(Object.keys(item));
}

return { response: outputtext };
`.trim();
    console.log('Updated Format WA Response to show actual errors and debug info');
}

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Saved.');
