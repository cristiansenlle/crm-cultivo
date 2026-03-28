const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

// The bash $1 ate the variable, so it became "{}" instead of "{{costo_unitario}}"
wf.nodes.forEach(n => {
    if (n.name === 'ingresar_insumo' || n.name === 'ingresar_insumo_groq') {
        const bodyValues = n.parameters?.parametersBody?.values;
        if (bodyValues) {
            bodyValues.forEach(val => {
                if (val.name === 'unit_cost' && val.value === '{}') {
                    val.value = '{{costo_unitario}}';
                    console.log(`Fixed unit_cost in ${n.name}`);
                }
            });
        }
    }
});

// Since the user also got a 500 error when asking "cuantos lotes hay cargados",
// we should double check if the Groq LLM or memory node got corrupted.
let corrupted = 0;
wf.nodes.forEach(n => {
    if (n.parameters && typeof n.parameters.sessionKey === 'string' && n.parameters.sessionKey === '={}') {
        console.log(`Found corrupted sessionKey in ${n.name}`);
        corrupted++;
    }
});

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Saved.');
