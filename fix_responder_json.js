const fs = require('fs');

const file = 'n8n-crm-cannabis-workflow-FIXED.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

let patched = false;
data.nodes = data.nodes.map(n => {
    if (n.type === 'n8n-nodes-base.respondToWebhook' && n.name === 'Responder a WhatsApp PM2') {
        n.parameters.responseBody = "={{ JSON.stringify({ response: $json.output }) }}";
        patched = true;
    }
    return n;
});

if (patched) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log('Fixed Responder a WhatsApp PM2 responseBody format.');
} else {
    console.log('Node not found!');
}
