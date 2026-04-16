const fs = require('fs');
const file = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(file, 'utf8'));

let modified = 0;

const fixStr = (str) => {
    if (typeof str !== 'string') return str;
    let s = str;
    if (s.startsWith('=')) s = s.substring(1);
    s = s.replace(/\{\{\$fromAI\(['"]([^'"]+)['"]\)\}\}/g, '{$1}');
    return s;
};

wf.nodes.forEach(n => {
    if (n.type === '@n8n/n8n-nodes-langchain.toolHttpRequest') {
        if (n.parameters.url) n.parameters.url = fixStr(n.parameters.url);
        if (n.parameters.jsonBody) {
            let b = n.parameters.jsonBody;
            if (b.startsWith('=')) b = b.substring(1);

            // Fix double {{$fromAI()}} calls first
            b = b.replace(/\{\{\$fromAI\(['"]([^'"]+)['"]\)\}\}/g, '{$1}');

            if (n.name === 'ingresar_insumo') {
                // Special case for math expression
                b = b.replace(/\{\$fromAI\('costo_total'\)\s*\/\s*\$fromAI\('cantidad'\)\}/g, '{costo_unitario}');
                b = b.replace(/\{costo_total\}\s*\/\s*\{cantidad\}/g, '{costo_unitario}');

                let pd = n.parameters.placeholderDefinitions;
                if (pd && pd.values) {
                    pd.values = pd.values.filter(v => v.name !== 'costo_total');
                    if (!pd.values.find(v => v.name === 'costo_unitario')) {
                        pd.values.push({
                            name: 'costo_unitario',
                            description: 'Costo por unidad de volumen/peso',
                            type: 'number',
                            required: true
                        });
                    }
                }
            }
            n.parameters.jsonBody = b;
        }
        modified++;
    }
});

fs.writeFileSync(file, JSON.stringify(wf, null, 2));
console.log('Modificados:', modified);
