const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('n8n-crm-cannabis-TOKENS-FIXED-2026-03-28.json'));

wf.nodes.forEach(n => {
    if (n.name.includes('reportar_evento')) {
        console.log(`\n=== ${n.name} ===`);
        console.log('URL:', n.parameters.url);
        console.log('Method:', n.parameters.method);
        const headers = n.parameters.parametersHeaders?.values || [];
        console.log('Headers:', JSON.stringify(headers));
        const body = n.parameters.parametersBody?.values || [];
        console.log('Body:', JSON.stringify(body));
        console.log('Desc:', n.parameters.toolDescription);
    }
});
