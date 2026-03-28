const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

let changed = [];
wf.nodes.forEach(n => {
    if (n.type === '@n8n/n8n-nodes-langchain.agent') {
        n.onError = 'continueErrorOutput';
        changed.push(n.name);
    }
});
console.log('Set continueErrorOutput for:', changed);

const formatWA = wf.nodes.find(n => n.name === 'Format WA Response');
if (formatWA) {
    formatWA.parameters.jsCode = `const item = $input.first().json;
let outputtext = '';

if (item.error) {
    const errStr = typeof item.error === 'string' ? item.error : (item.error.message || JSON.stringify(item.error));
    outputtext = 'Error interno del modelo de IA: ' + errStr;
} else if (item.output) {
    outputtext = item.output;
} else if (item.text) {
    outputtext = item.text;
} else if (item.response) {
    outputtext = item.response;
} else {
    try {
        if (item.generations && item.generations[0] && item.generations[0][0]) {
            outputtext = item.generations[0][0].text || '';
        }
    } catch(e) {}
}

if (!outputtext) {
    const keys = Object.keys(item).join(', ');
    outputtext = 'Sin respuesta del modelo. Datos disponibles: ' + keys;
}

return [{ json: { response: outputtext } }];
`;
    console.log('Updated Format WA Response code.');
}

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Done.');
