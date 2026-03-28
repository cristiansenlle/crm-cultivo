const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

// 'fromInput' only works with Chat Trigger nodes, NOT Webhooks.
// Fix: use customKey mode with explicit node reference to Hoist Session ID
wf.nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.memoryBufferWindow').forEach(m => {
    delete m.parameters.sessionIdOption;
    m.parameters.sessionIdType = 'customKey';
    // Reference the Hoist Session ID code node output directly by node name
    // This is guaranteed to work in n8n regardless of execution context
    m.parameters.sessionKey = "={{ $('Hoist Session ID').item.json.sessionId }}";
    console.log('Fixed:', m.name, '->', m.parameters.sessionKey);
});

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Done.');
