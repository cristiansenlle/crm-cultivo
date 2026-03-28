const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

// =====================================================
// 1. Restore original chain: Webhook WhatsApp → Hoist Session ID → IF Audio o Texto
// =====================================================
wf.connections['Webhook WhatsApp'] = {
    main: [[{ node: 'Hoist Session ID', type: 'main', index: 0 }]]
};
wf.connections['Hoist Session ID'] = {
    main: [[{ node: 'IF Audio o Texto', type: 'main', index: 0 }]]
};
console.log('Restored: Webhook WhatsApp -> Hoist Session ID -> IF Audio o Texto');

// =====================================================
// 2. Check existing IF Audio o Texto connections
// =====================================================
const ifConn = wf.connections['IF Audio o Texto'];
console.log('IF Audio o Texto connections:', JSON.stringify(ifConn, null, 2));

// =====================================================
// 3. Fix memory nodes: use fromInput mode
//    'Hoist Session ID' already sets item.json.sessionId = phone
//    The memory node with 'fromInput' reads exactly that field
// =====================================================
wf.nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.memoryBufferWindow').forEach(m => {
    // Remove custom key, use fromInput (reads 'sessionId' field from input)
    delete m.parameters.sessionIdType;
    delete m.parameters.sessionKey;
    m.parameters.sessionIdOption = 'fromInput';
    console.log('Fixed memory node (fromInput):', m.name);
});

// =====================================================
// 4. Remove "Prepare WA Input" Set node that we added (it breaks the audio chain)
// =====================================================
const prepIdx = wf.nodes.findIndex(n => n.name === 'Prepare WA Input');
if (prepIdx !== -1) {
    wf.nodes.splice(prepIdx, 1);
    delete wf.connections['Prepare WA Input'];
    console.log('Removed: Prepare WA Input (was bypassing audio handling)');
}

// =====================================================
// 5. Restore AI Agent text to read from body (Hoist passes body intact)
// =====================================================
const agent = wf.nodes.find(n => n.name === 'AI Agent (Function Calling)');
if (agent) {
    agent.parameters.text = "={{ $json?.body?.body || $json?.text || '' }}";
    console.log('Restored Agent text expression');
}

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('\nDone. Session ID flow restored via Hoist Session ID Code node.');
