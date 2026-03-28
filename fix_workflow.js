const fs = require('fs');

const file = 'n8n-crm-cannabis-workflow.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

// 1. Remove any stray WhatsApp node just in case
data.nodes = data.nodes.filter(n => !n.type.toLowerCase().includes('whatsappbusiness'));

// 2. Ensure wa-inbound webhook has respondMode: 'responseNode'
const waInbound = data.nodes.find(n => n.name === 'Webhook WhatsApp' || n.parameters?.path === 'wa-inbound');
if (waInbound) {
    waInbound.parameters.responseMode = 'responseNode';
}

// 3. Create a Respond to Webhook Node
const respondNodeName = 'Responder a WhatsApp PM2';
const respondNode = {
    "parameters": {
      "respondWith": "json",
      "responseBody": "={\n  \"response\": \"{{ $json.output }}\"\n}",
      "options": {}
    },
    "id": "respond-wa-" + Math.random().toString(36).substr(2, 9),
    "name": respondNodeName,
    "type": "n8n-nodes-base.respondToWebhook",
    "typeVersion": 1.1,
    "position": [
      1400,
      450
    ]
};

// Remove old one if exists
data.nodes = data.nodes.filter(n => n.name !== respondNodeName);
data.nodes.push(respondNode);

// 4. Connect AI Agent -> Respond to Webhook
if (!data.connections['If Agent 1 Failed']) data.connections['If Agent 1 Failed'] = {};
if (!data.connections['If Agent 1 Failed'].main) data.connections['If Agent 1 Failed'].main = [[],[]];

// AI output usually comes from the Agent node or the fallback. Let's wire the false branch of "If Agent 1 Failed" (which means success)
const falseBranch = data.connections['If Agent 1 Failed'].main[1] || [];
data.connections['If Agent 1 Failed'].main[1] = [
    ...falseBranch,
    {
        "node": respondNodeName,
        "type": "main",
        "index": 0
    }
];

// Fallback Groq connects there too
if (!data.connections['AI Agent (Groq Fallback)']) data.connections['AI Agent (Groq Fallback)'] = {};
if (!data.connections['AI Agent (Groq Fallback)'].main) data.connections['AI Agent (Groq Fallback)'].main = [[]];
data.connections['AI Agent (Groq Fallback)'].main[0] = [
    {
        "node": respondNodeName,
        "type": "main",
        "index": 0
    }
];

fs.writeFileSync('n8n-crm-cannabis-workflow-FIXED.json', JSON.stringify(data, null, 2));
console.log('Saved fixed workflow to n8n-crm-cannabis-workflow-FIXED.json');
