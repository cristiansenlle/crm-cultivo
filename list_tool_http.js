const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('pulled_wf.json', 'utf8'));

wf.nodes.forEach(n => {
   if (n.type === 'n8n-nodes-base.toolHttpRequest' && n.name.includes('telemetria')) {
       console.log("TOOL:", n.name);
       console.log("Params:", JSON.stringify(n.parameters, null, 2));
   }
});
