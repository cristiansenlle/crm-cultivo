const fs = require('fs');
const file = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(file, 'utf8'));

wf.nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.toolHttpRequest').forEach(t => {
    // 1. Fix Headers
    if (t.parameters.sendHeaders && t.parameters.headerParameters && t.parameters.headerParameters.parameters) {
        t.parameters.headerParameters.parameters.forEach(hp => {
            hp.valueProvider = 'fieldValue';
        });
    }

    // 2. Fix Body parsing by replacing JSON body with keypairs manually defined from placeholderDefinitions
    if (t.parameters.specifyBody === 'json' && t.parameters.jsonBody) {
        const bodyStr = t.parameters.jsonBody;

        t.parameters.specifyBody = 'keypair';
        t.parameters.bodyParameters = {
            parameters: []
        };

        // Let's do a simple regex find for keys and values
        // For example: "stage": "{nueva_fase}" or "weight_wet": {peso_gramos}
        const regex = /"([^"]+)"\s*:\s*("?[^{]*?{([^}]+)}[^\s,]*"?|"[^"]*"|[0-9]+|true|false)/g;
        let match;
        while ((match = regex.exec(bodyStr)) !== null) {
            const key = match[1];
            let value = match[2];
            // Remove wrapping quotes if they exist around the value
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1);
            }
            t.parameters.bodyParameters.parameters.push({
                name: key,
                value: value,
                valueProvider: 'fieldValue' // Tell n8n to parse {variables} and send LLM param
            });
        }

        delete t.parameters.jsonBody;
        console.log(`Converted body for: ${t.name}`);
    }
});

fs.writeFileSync(file, JSON.stringify(wf, null, 2));
console.log('Successfully patched headers and jsonBody keypairs for all tools.');
