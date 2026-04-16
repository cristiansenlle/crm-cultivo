const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

// 1. Re-enable continueOnFail on Gemini Agent so it doesn't crash n8n
const gemini = wf.nodes.find(n => n.name === 'AI Agent (Function Calling)');
if (gemini) {
    gemini.continueOnFail = true;
    console.log('Re-enabled continueOnFail on Gemini');
}

// 2. Restore routing to the IF node
if (wf.connections[gemini.name]) {
    wf.connections[gemini.name] = { main: [[{ node: 'If Gemini Error?', type: 'main', index: 0 }]] };
    console.log('Restored Agent -> IF Error routing');
}

// 3. Restore dynamic memory session parameter referencing Hoist Session ID
wf.nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.memoryBufferWindow').forEach(m => {
    m.parameters.sessionKey = "={{ $('Hoist Session ID').item.json.sessionId }}";
    console.log('Restored dynamic session key on:', m.name);
});

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Done. Fallback system restored.');
