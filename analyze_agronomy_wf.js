const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('active_wf_extracted.json', 'utf8'));
const tools = wf.nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.toolHttpRequest');
tools.forEach(t => {
    if(t.name.includes('reportar')) {
        console.log(`--- TOOL: ${t.name} ---`);
        console.log(`Description: ${t.parameters?.description}`);
        const paramsUi = t.parameters?.bodyParametersUi;
        if (paramsUi && paramsUi.parameter) {
             console.log(`Body: ${paramsUi.parameter.map(p=>p.name + ":" + p.value).join(', ')}`);
        } else {
             console.log(`BodyRaw: ${t.parameters?.jsonBody}`);
        }
        console.log(`URL: ${t.parameters?.url}`);
    }
});
