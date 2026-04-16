const fs = require('fs');

const OLD_URL = "https://dvvfdsaqvcyftaaronhd.supabase.co/rest/v1/";
const NEW_URL = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/";
const NEW_KEY = "HIDDEN_SECRET_BY_AI";

const workflowFile = 'active_workflow_downloaded.json';
const fullPayload = JSON.parse(fs.readFileSync(workflowFile, 'utf8'));
const wf = fullPayload[0];

// Extract nodes from Buffer if it is a buffer object
let nodes;
if (wf.nodes && wf.nodes.type === 'Buffer') {
    const nodesStr = Buffer.from(wf.nodes.data).toString('utf8');
    nodes = JSON.parse(nodesStr);
    console.log('Decoded nodes from Buffer');
} else if (Array.isArray(wf.nodes)) {
    nodes = wf.nodes;
    console.log('Nodes found as direct Array');
} else {
    console.error('Unknown nodes structure:', typeof wf.nodes);
    process.exit(1);
}

// Also connections
let connections;
if (wf.connections && wf.connections.type === 'Buffer') {
    const connStr = Buffer.from(wf.connections.data).toString('utf8');
    connections = JSON.parse(connStr);
    console.log('Decoded connections from Buffer');
} else {
    connections = wf.connections;
}

// -------------------------------------------------------------
// PATCH NODES
// -------------------------------------------------------------
nodes.forEach(node => {
    // Check if it's a LangChain tool or any node with URL/apikey
    if (node.type === '@n8n/n8n-nodes-langchain.toolHttpRequest' || (node.parameters && node.parameters.url)) {
        const params = node.parameters;
        
        // 1. Update URL
        if (params.url && params.url.includes('dvvfdsaqvcyftaaronhd.supabase.co')) {
            params.url = params.url.replace(/https:\/\/[^/]+\.supabase\.co\/rest\/v1\//, NEW_URL);
            console.log(`Updated URL for node: ${node.name}`);
        }

        // 2. Update Headers
        if (params.parametersHeaders && params.parametersHeaders.values) {
            params.parametersHeaders.values.forEach(h => {
                if (h.name === 'apikey' || h.name === 'Authorization') {
                    if (h.name === 'Authorization') {
                        h.value = `Bearer ${NEW_KEY}`;
                    } else {
                        h.value = NEW_KEY;
                    }
                    console.log(`Updated ${h.name} for node: ${node.name}`);
                }
            });
        }

        // 3. Update Body (Add room_id for cargar_telemetria)
        if (node.name.includes('cargar_telemetria')) {
            if (params.parametersBody && params.parametersBody.values) {
                const hasRoomId = params.parametersBody.values.some(v => v.name === 'room_id');
                if (!hasRoomId) {
                    params.parametersBody.values.push({
                        name: "room_id",
                        value: "{sala_o_lote}",
                        valueProvider: "fieldValue"
                    });
                    console.log(`Added room_id to node: ${node.name}`);
                }
            }
        }
    }

    // Also check for Execute Command nodes (like Bypass PG)
    if (node.type === 'n8n-nodes-base.executeCommand' && node.parameters.command) {
        if (node.parameters.command.includes('dvvfdsaqvcyftaaronhd.supabase.co')) {
            node.parameters.command = node.parameters.command
                .replace(/https:\/\/[^/]+\.supabase\.co\/rest\/v1\//g, NEW_URL)
                .replace(/apikey':\s*'[^']+'/g, `apikey': '${NEW_KEY}'`)
                .replace(/Bearer\s+[^']+'/g, `Bearer ${NEW_KEY}'`);
            
            // Explicitly add room_id if it's the bypass telemetry node
            if (node.name.includes('Bypass PG') && !node.parameters.command.includes('room_id')) {
                node.parameters.command = node.parameters.command.replace('batch_id:', 'room_id: \'' + '{{$json.body.batch_id}}' + '\', batch_id:');
            }
            
            console.log(`Updated Command for node: ${node.name}`);
        }
    }
});

// -------------------------------------------------------------
// RE-ENCODE
// -------------------------------------------------------------
if (wf.nodes.type === 'Buffer') {
    const patchedNodesStr = JSON.stringify(nodes);
    wf.nodes.data = Array.from(Buffer.from(patchedNodesStr, 'utf8'));
    console.log('Encoded nodes back to Buffer');
} else {
    wf.nodes = nodes;
}

if (wf.connections && wf.connections.type === 'Buffer') {
    const patchedConnStr = JSON.stringify(connections);
    wf.connections.data = Array.from(Buffer.from(patchedConnStr, 'utf8'));
}

fs.writeFileSync('active_workflow_patched.json', JSON.stringify([wf], null, 2));
console.log('Workflow patched and saved to active_workflow_patched.json');
