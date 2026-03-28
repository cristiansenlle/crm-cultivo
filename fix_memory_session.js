const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

wf.nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.memoryBufferWindow').forEach(m => {
    m.parameters.sessionIdType = 'customKey';
    // Use single quotes inside expression to avoid JSON escaping conflicts
    m.parameters.sessionKey = "={{ $json.body.phone || 'wa-default' }}";
    console.log('Fixed:', m.name, '->', m.parameters.sessionKey);
});

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Done.');
