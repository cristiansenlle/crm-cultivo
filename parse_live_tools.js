const fs = require('fs');
const nodes = JSON.parse(fs.readFileSync('current_live_nodes.json', 'utf8'));

for (const n of nodes) {
    if (n.type === '@n8n/n8n-nodes-langchain.toolHttpRequest') {
        console.log("--- Tool:", n.name);
        console.log("URL:", n.parameters.url);
        if (n.parameters.parametersHeaders && n.parameters.parametersHeaders.values) {
            for (const h of n.parameters.parametersHeaders.values) {
                if (h.name === 'apikey') console.log("API Key length:", h.value.length);
            }
        }
    }
}
