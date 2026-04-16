const fs = require('fs');
const targetFile = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow-PROTOCOLOS-2026-03-21.json';

const wf = JSON.parse(fs.readFileSync(targetFile, 'utf8'));

// Safely identify the exact AI Agent nodes
const aiAgents = wf.nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.agent' || n.type === '@n8n/n8n-nodes-langchain.agentTool');

console.log(`Found ${aiAgents.length} Agents:`);
aiAgents.forEach(a => console.log("-", a.name));

console.log("\nConnections from 'consultar_protocolos':");
console.log(JSON.stringify(wf.connections["consultar_protocolos"], null, 2));

console.log("\nConnections from 'crear_protocolo':");
console.log(JSON.stringify(wf.connections["crear_protocolo"], null, 2));
