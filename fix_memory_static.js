const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

// FIX 1: Set memory nodes to a guaranteed static session key
// This eliminates memory as the crash source and verifies if agent works bare
wf.nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.memoryBufferWindow').forEach(m => {
    m.parameters.sessionIdType = 'customKey';
    // Static key - guaranteed to never be empty
    m.parameters.sessionKey = 'cannabis-crm-wa';
    console.log('Fixed memory node session key (static):', m.name);
});

// FIX 2: Update Format WA Response to handle ALL possible output field names
// n8n AI Agent can output 'output', 'text', or 'response' depending on version
const formatNode = wf.nodes.find(n => n.name === 'Format WA Response');
if (formatNode) {
    formatNode.parameters.jsCode = `
const item = $input.first().json;
const outputtext = item.output
    || item.text  
    || item.response
    || (item.generations && item.generations[0] && item.generations[0][0] && item.generations[0][0].text)
    || 'Lo siento, no pude procesar tu consulta.';
return { response: outputtext };
`.trim();
    console.log('Updated: Format WA Response to check all possible output field names');
}

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Done.');
