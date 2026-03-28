const fs = require('fs');
const nodesStr = fs.readFileSync('patched_ai_workflow_p.json', 'utf8');
const nodes = JSON.parse(nodesStr);
const aiNode = nodes.find(n => n.name === 'AI Agent (Function Calling)');
console.log("Local patched file has the new prompt?", aiNode.parameters.options.systemMessage.includes('EJ: TELEMETRÍA REQUIERE BUSCAR EXACTAMENTE LA SALA'));
