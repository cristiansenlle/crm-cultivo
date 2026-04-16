const fs = require('fs');

// Load k2d raw data (which had the correct full structure but problematic nodes)
const k2dRaw = JSON.parse(fs.readFileSync('k2d_raw.json', 'utf8'));
let nodes = JSON.parse(k2dRaw.nodes);
let connections = JSON.parse(k2dRaw.connections);

console.log('--- RESTORING CLEAN WORKFLOW ---');

// 1. Replace the problematic 'executeCommand' node with a safe 'No-Op' or 'Set'
nodes = nodes.map(n => {
    if (n.type === 'n8n-nodes-base.executeCommand') {
        console.log(`Patching node: ${n.name} (converting executeCommand to noOp)`);
        return {
            ...n,
            type: 'n8n-nodes-base.noOp',
            parameters: {}
        };
    }
    
    // 2. Ensure "Format WA Response" has the definitive sanitization logic
    if (n.name === 'Format WA Response') {
        console.log('Patching node: Format WA Response (injecting sanitization logic)');
        n.parameters = {
            jsCode: `
// --- DEFINITIVE SANITIZATION LOGIC ---
const item = $input.first().json;
let outputtext = '';

// Extract text from common AI node outputs
if (item.error) {
    const errStr = typeof item.error === 'string' ? item.error : (item.error.message || JSON.stringify(item.error));
    outputtext = 'Error interno: ' + errStr;
} else if (item.output) {
    outputtext = item.output;
} else if (item.text) {
    outputtext = item.text;
} else if (item.response) {
    outputtext = item.response;
} else {
    try {
        if (item.generations && item.generations[0] && item.generations[0][0]) {
            outputtext = item.generations[0][0].text || '';
        }
    } catch(e) {}
}

if (!outputtext) {
    const keys = Object.keys(item).join(', ');
    outputtext = 'Sin respuesta. Campos: ' + keys;
}

// ---------------------------------------------------------
// ROOM NAME SANITIZATION (The specific fix requested)
// ---------------------------------------------------------

// Match legacy names/UUIDs and replace with friendly names
// Patterns to catch: "carpa1", "sala-1", "sala1", "2de302401-...", "sala-veg-1"
outputtext = outputtext
    .replace(/(sala[- ]?1|carpa[- ]?1|sala[- ]?veg[- ]?1)/gi, "Carpa 1")
    .replace(/(sala[- ]?2|carpa[- ]?2|sala[- ]?flo[- ]?1)/gi, "Carpa 2")
    // Hide UUIDs (legacy telemetry IDs)
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "[Sala]")
    // Clean up typical AI-generated markers
    .replace(/<function=[^>]+>/g, '')
    .trim();

return [{ json: { response: outputtext } }];
            `
        };
        n.typeVersion = 1;
    }
    
    return n;
});

// Final JSON to import
const finalImport = {
    name: "CRM Cannabis",
    nodes: nodes,
    connections: connections,
    active: true,
    settings: {},
    staticData: null,
    meta: {
        templateId: ""
    },
    tags: []
};

// Wrap in array as required by n8n import
fs.writeFileSync('wf_definitive_restoration.json', JSON.stringify([finalImport], null, 2));
console.log('Saved wf_definitive_restoration.json');
