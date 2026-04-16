const fs = require('fs');

const data = JSON.parse(fs.readFileSync('n8n-crm-cannabis-workflow-FIXED.json', 'utf8'));

data.nodes.forEach(n => {
    if (n.type.includes('agent') || n.name.toLowerCase().includes('agent')) {
        console.log("----- AGENT NODE:", n.name, "-----");
        if (n.parameters && n.parameters.options && n.parameters.options.systemMessage) {
            console.log(n.parameters.options.systemMessage);
        } else if (n.parameters && n.parameters.prompt) {
             console.log(n.parameters.prompt);
        } else {
             console.log("No prompt found in node params:", Object.keys(n.parameters || {}));
        }
    }
});
