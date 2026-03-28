const fs = require('fs');
const file = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(file, 'utf8'));

wf.nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.toolHttpRequest').forEach(t => {

    if (t.parameters.bodyParameters) {
        if (t.parameters.bodyParameters.parameters) {
            t.parameters.parametersBody = {
                values: t.parameters.bodyParameters.parameters
            };
        }
        delete t.parameters.bodyParameters;
    }

    if (t.parameters.headerParameters) {
        if (t.parameters.headerParameters.parameters) {
            t.parameters.parametersHeaders = {
                values: t.parameters.headerParameters.parameters
            };
        }
        delete t.parameters.headerParameters;
    }
});

fs.writeFileSync(file, JSON.stringify(wf, null, 2));
console.log('Successfully renamed bodyParameters -> parametersBody.values and headerParameters -> parametersHeaders.values');
