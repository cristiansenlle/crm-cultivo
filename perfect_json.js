const fs = require('fs');
const path = 'c:\\Users\\Cristian\\.gemini\\antigravity\\crm cannabis\\n8n-crm-cannabis-workflow.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

// 1. Add WhatsApp Send Node
if (!data.nodes.find(n => n.name === 'WhatsApp (Business-API)')) {
    data.nodes.push({
        "parameters": {
            "phoneNumberId": "489993374191494",
            "recipientPhoneNumber": "={{ $json.phone || $json.recipient || '5491136254422' }}",
            "text": "={{ $json.response || $json.reply || $json.Mensaje || $json.text }}"
        },
        "id": "wa-send-id-final",
        "name": "WhatsApp (Business-API)",
        "type": "n8n-nodes-base.whatsAppBusiness",
        "typeVersion": 1,
        "position": [1400, 600],
        "credentials": {
            "whatsAppBusinessCloudApi": {
                "id": "B1MpxN70I3YlVp7k", 
                "name": "WhatsApp Business Cloud API account"
            }
        }
    });
    console.log('Node added.');
}

// 2. Add connections
if (!data.connections) data.connections = {};
const formatters = ['Format WA Response', 'Format Env Response', 'Format Sale Response'];
formatters.forEach(f => {
    const node = data.nodes.find(n => n.name === f);
    if (node) {
        if (!data.connections[f]) data.connections[f] = { "main": [[]] };
        if (!data.connections[f].main[0].find(c => c.node === 'WhatsApp (Business-API)')) {
            data.connections[f].main[0].push({
                "node": "WhatsApp (Business-API)",
                "type": "main",
                "index": 0
            });
            console.log(`Connected ${f} to WhatsApp node.`);
        }
    }
});

fs.writeFileSync(path + '.perfected', JSON.stringify(data, null, 2));
console.log('Perfected JSON saved.');
