const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

wf.nodes.forEach(n => {
    if (n.name.includes('OpenRouter')) {
        // Remove BaseURL from the node options, because for Custom APIs it goes in the Credential
        if (n.parameters && n.parameters.options && n.parameters.options.baseURL) {
            delete n.parameters.options.baseURL;
        }

        // Change the credential pointer type from openAiApi to openAiCustomApi
        n.credentials = {
            "openAiCustomApi": {
                "id": "",
                "name": "OpenRouter API"
            }
        };
        console.log(`Updated ${n.name} to use openAiCustomApi credential type`);
    }
});

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Saved repair.');
