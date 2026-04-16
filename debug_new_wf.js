const fs = require('fs');

const file = 'n8n-crm-cannabis-workflow-PROTOCOLOS-2026-03-21.json';
const wf = JSON.parse(fs.readFileSync(file, 'utf8'));

const getTool = wf.nodes.find(n => n.name === 'consultar_protocolos');
const postTool = wf.nodes.find(n => n.name === 'crear_protocolo');
const agents = wf.nodes.filter(n => n.type.includes('agent') || n.name.toLowerCase().includes('agent'));

console.log("=== GET TOOL ===");
if (getTool) {
    console.log("URL:", getTool.parameters.url);
    console.log("Headers:", JSON.stringify(getTool.parameters.headerParameters));
} else {
    console.log("Not found");
}

console.log("\n=== POST TOOL ===");
if (postTool) {
    console.log("URL:", postTool.parameters.url);
    console.log("Headers:", JSON.stringify(postTool.parameters.headerParameters));
    console.log("Body specs:", JSON.stringify(postTool.parameters.parametersBody));
} else {
    console.log("Not found");
}

console.log("\n=== AGENT CONNECTIONS ===");
console.log("Connections for getTool:");
console.log(JSON.stringify(wf.connections[getTool.id], null, 2));

console.log("\nConnections for postTool:");
console.log(JSON.stringify(wf.connections[postTool.id], null, 2));

console.log("\n=== AGENT SYSTEM PROMPTS ===");
agents.forEach(n => {
    console.log(n.name, ":", n.parameters?.options?.systemMessage?.substring(0, 100) + "...");
});
