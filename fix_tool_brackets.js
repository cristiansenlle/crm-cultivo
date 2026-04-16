const fs = require('fs');
const file = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(file, 'utf8'));

wf.nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.toolHttpRequest').forEach(t => {

    if (t.parameters.specifyBody === 'keypair' && t.parameters.bodyParameters && t.parameters.bodyParameters.parameters) {

        t.parameters.bodyParameters.parameters.forEach(bp => {
            // Check if it's already wrapped in {}
            if (typeof bp.value === 'string' && !bp.value.startsWith('{') && !bp.value.endsWith('}')) {
                // Determine if this string matches one of our defined placeholder definitions
                const phDef = t.parameters.placeholderDefinitions?.values?.find(x => x.name === bp.value);
                if (phDef) {
                    bp.value = `{${bp.value}}`;
                } else if (t.parameters.placeholderDefinitions?.values?.some(x => x.name === bp.name)) {
                    // The value string didn't exactly match the placeholder definition string
                    // Example: We have {"stage": "{nueva_fase}"}. In the previous migration:
                    // The key was stage, the value became was {nueva_fase}. But for numbers like
                    // {peso_gramos}, the value became {peso_gramos}. Then we stripped it to peso_gramos.
                    // The easiest fix is just use `{${bp.name}}` if the user named the placeholder identical to the key,
                    // but we know in 'nueva_fase' they don't match.

                    // Let's just wrap any value that corresponds to a known placeholder.
                    const foundPH = t.parameters.placeholderDefinitions.values.find(x => bp.value.includes(x.name));
                    if (foundPH) {
                        bp.value = `{${foundPH.name}}`;
                    }
                }
            }
        });

        // Hardcode edge cases where the key doesn't match placeholder name
        if (t.name === 'avanzar_fase') {
            const param = t.parameters.bodyParameters.parameters.find(p => p.name === 'stage');
            if (param && !param.value.includes('{')) param.value = '{nueva_fase}';
        }
    }
});

// Since the previous migration script might have stripped {} from all values, 
// a safer approach is to re-run the conversion from scratch on the original JSON format
// But wait, the previous script deleted jsonBody. 
// Let's just blindly wrap any value that is NOT a literal string and doesn't have {}
// Actually, let's just make the value field equal to `{${bp.value}}` for ALL items that don't have {}
// because we know we want the LLM to provide *all* these fields dynamically.
wf.nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.toolHttpRequest').forEach(t => {
    if (t.parameters.specifyBody === 'keypair' && t.parameters.bodyParameters && t.parameters.bodyParameters.parameters) {
        t.parameters.bodyParameters.parameters.forEach(bp => {
            if (typeof bp.value === 'string' && !bp.value.includes('{')) {
                // Find matching placeholder definition by searching if the value partially matches a placeholder name
                const defs = t.parameters.placeholderDefinitions?.values || [];
                const matchedDef = defs.find(d => bp.value === d.name);

                if (matchedDef) {
                    bp.value = `{${matchedDef.name}}`;
                } else {
                    // If it doesn't match exactly, maybe the value IS the placeholder name that we stripped early.
                    // Let's just wrap it.
                    bp.value = `{${bp.value}}`;
                }
            }
        });
    }
});

fs.writeFileSync(file, JSON.stringify(wf, null, 2));
console.log('Successfully wrapped variables in brackets for all tools.');
