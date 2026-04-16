const fs = require('fs');

// 1. Load the complete nodes and connections from our best local copy
// I'll use 'server_nodes_live.json' for nodes.
// I'll use 'live_connections_v2.json' for connections.

const nodes = JSON.parse(fs.readFileSync('server_nodes_live.json', 'utf8'));
const connections = JSON.parse(fs.readFileSync('live_connections_v2.json', 'utf8'));

// 2. Ensure the sanitizer is CORRECT
const sanitizer = nodes.find(n => n.name === 'Format WA Response' || n.name === 'SANITY_RENAME_TEST');
if (sanitizer) {
    sanitizer.name = 'Format WA Response';
    sanitizer.parameters.jsCode = `
const item = $input.first().json;
let res = item.output || item.text || item.response || "";
if (typeof res !== 'string') res = JSON.stringify(res);

// 1. Literal UUID replacement (Split/Join is more robust than regex)
res = res.split('2de32401-cb5f-4bbd-9b67-464aa703679c').join('Carpa 1');

// 2. General UUID regex for Any Other UUIDs
const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
res = res.replace(uuidRegex, 'Carpa 1');

// 3. Clean up headers/labels leaked by Agent
res = res.replace(/Sala ID[:\\\\s]*/gi, '');
res = res.replace(/id_interno_oculto[:\\\\s]*/gi, '');

return [{ json: { response: res.trim() } }];
`;
}

// 3. Construct the n8n export format
const workflow = {
    id: "scpZdPe5Cp4MG98G",
    name: "CRM Cannabis",
    nodes: nodes,
    connections: connections,
    settings: {
        saveExecutionProgress: true,
        saveManualExecutions: true,
        saveDataErrorExecution: "all"
    },
    active: true
};

fs.writeFileSync('wf_final_import.json', JSON.stringify([workflow], null, 2));
console.log('Final n8n import file generated.');
