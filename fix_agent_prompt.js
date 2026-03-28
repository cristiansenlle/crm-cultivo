const fs = require('fs');
const file = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(file, 'utf8'));

const agent = wf.nodes.find(n => n.name === 'AI Agent (Function Calling)');
if (agent) {
    console.log('Original agent props:', agent.parameters);
    agent.parameters.text = "={{ $json?.body?.body || $json?.text || '' }}";

    fs.writeFileSync(file, JSON.stringify(wf, null, 2));
    console.log('Fixed agent parameters in workflow JSON.');
} else {
    console.log('Agent node not found!');
}
