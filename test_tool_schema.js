const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json', 'utf8'));

function extractParametersFromText(text, sendIn, placeholderDefinitions) {
    if (!text) return [];
    const parameters = [];
    const regex = /{([^}]+)}/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        let name = match[1];
        if (name.startsWith('{')) name = name.substring(1); // Handle {{var}} if any

        const def = placeholderDefinitions.find((d) => d.name === name);
        if (def) {
            parameters.push({ ...def, required: true, sendIn });
        } else {
            // For testing purposes, print unused variables anyway to see if they match properly
            parameters.push({ name: name, type: 'string', description: '', required: true, sendIn });
        }
    }
    return parameters;
}

const t = wf.nodes.find(n => n.name === 'ingresar_insumo');
const p = t.parameters;
const placeholderDefinitions = (p.placeholderDefinitions && p.placeholderDefinitions.values) ? p.placeholderDefinitions.values : [];
let parameters = [];

if (p.specifyBody === 'keypair' && p.parametersBody && p.parametersBody.values) {
    for (const bp of p.parametersBody.values) {
        if (bp.valueProvider === 'fieldValue' && bp.value) {
            parameters.push(...extractParametersFromText(bp.value, 'body', placeholderDefinitions));
        } else if (bp.valueProvider === 'modelRequired') {
            parameters.push({ name: bp.name, description: '', type: 'string', required: true, sendIn: 'body' });
        } else if (bp.valueProvider === 'modelOptional') {
            parameters.push({ name: bp.name, description: '', type: 'string', required: false, sendIn: 'body' });
        }
    }
}

console.log(JSON.stringify(parameters, null, 2));
