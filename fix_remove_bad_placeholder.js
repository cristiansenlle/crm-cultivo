const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

let removed = 0;

wf.nodes.forEach(n => {
    if (n.type !== '@n8n/n8n-nodes-langchain.toolHttpRequest') return;
    if (!n.parameters.placeholderDefinitions || !n.parameters.placeholderDefinitions.values) return;

    const before = n.parameters.placeholderDefinitions.values.length;
    // Remove only the dummy 'filtro_opcional' placeholder we incorrectly added
    n.parameters.placeholderDefinitions.values = n.parameters.placeholderDefinitions.values.filter(
        p => p.name !== 'filtro_opcional'
    );
    // Also remove it from description if it was appended
    if (n.parameters.description && n.parameters.description.includes('[LLM Params: {filtro_opcional}]')) {
        n.parameters.description = n.parameters.description
            .replace(' [LLM Params: {filtro_opcional}]', '')
            .replace('[LLM Params: {filtro_opcional}]', '');
    }
    const after = n.parameters.placeholderDefinitions.values.length;
    if (before !== after) {
        removed++;
        console.log('Removed filtro_opcional from:', n.name);
    }
});

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Total removed:', removed);
