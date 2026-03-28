const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

// =====================================================
// 1. Add a "Prepare WA Input" Set node BEFORE the AI Agent
//    It normalizes the incoming WhatsApp payload so that:
//    - sessionId = phone number (required by memory node)
//    - text = the message body
// =====================================================
const setNodeName = 'Prepare WA Input';
if (!wf.nodes.find(n => n.name === setNodeName)) {
    wf.nodes.push({
        parameters: {
            values: {
                string: [
                    {
                        name: 'sessionId',
                        value: '={{ $json.body.phone }}'
                    },
                    {
                        name: 'text',
                        value: '={{ $json.body.body }}'
                    }
                ]
            },
            options: {
                keepOriginalFields: true  // Keep body/phone intact for the agent prompt
            }
        },
        id: 'prepare-wa-input-001',
        name: setNodeName,
        type: 'n8n-nodes-base.set',
        typeVersion: 1,
        position: [700, 2200]
    });
    console.log('Added: Prepare WA Input Set node');
}

// =====================================================
// 2. Update connections: Webhook WhatsApp -> Set node -> AI Agent
// =====================================================
// Get the webhook node that feeds the agent
const waWebhook = wf.nodes.find(n => n.name === 'Webhook WhatsApp');

// Check current connections from Webhook WhatsApp
console.log('Current Webhook WhatsApp connections:', JSON.stringify(wf.connections['Webhook WhatsApp'], null, 2));

// Wire: Webhook WhatsApp -> Prepare WA Input
wf.connections['Webhook WhatsApp'] = {
    main: [[{ node: setNodeName, type: 'main', index: 0 }]]
};

// Wire: Prepare WA Input -> AI Agent (Function Calling)
wf.connections[setNodeName] = {
    main: [[{ node: 'AI Agent (Function Calling)', type: 'main', index: 0 }]]
};
console.log('Updated connections: Webhook -> Set -> Agent');

// =====================================================
// 3. Fix both memory nodes: use fromInput mode (reads sessionId field)
// =====================================================
wf.nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.memoryBufferWindow').forEach(m => {
    // Switch to fromInput - looks for 'sessionId' field in the data
    m.parameters.sessionIdType = 'customKey';
    // Now sessionId is a proper top-level field, so this will work
    m.parameters.sessionKey = '={{ $json.sessionId }}';
    console.log('Updated memory node:', m.name);
});

// =====================================================
// 4. Also update the AI Agent text input to use the prepared 'text' field
// =====================================================
const agent = wf.nodes.find(n => n.name === 'AI Agent (Function Calling)');
if (agent) {
    agent.parameters.text = "={{ $json.text || $json.body?.body || '' }}";
    console.log('Updated Agent text input expression');
}

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('\nDone. Session ID now piped via Set node before Agent.');
