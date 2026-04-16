const fs = require('fs');

const NEW_URL = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/";
const NEW_KEY = "HIDDEN_SECRET_BY_AI";
const ROOM_UUID = "2de32401-cb5f-4bbd-9b67-464aa703679c";

const workflowFile = 'active_workflow_downloaded.json';
const fullPayload = JSON.parse(fs.readFileSync(workflowFile, 'utf8'));
const wf = fullPayload[0];

let nodes;
if (wf.nodes && wf.nodes.type === 'Buffer') {
    nodes = JSON.parse(Buffer.from(wf.nodes.data).toString('utf8'));
} else {
    nodes = wf.nodes;
}

nodes.forEach(node => {
    // 1. Patch ALL tool nodes for URL and auth
    if (node.type === '@n8n/n8n-nodes-langchain.toolHttpRequest') {
        const params = node.parameters;
        if (params.url && params.url.includes('.supabase.co')) {
            params.url = params.url.replace(/https:\/\/[^/]+\.supabase\.co\/rest\/v1\//, NEW_URL);
        }
        if (params.parametersHeaders && params.parametersHeaders.values) {
            params.parametersHeaders.values.forEach(h => {
                if (h.name === 'apikey') h.value = NEW_KEY;
                if (h.name === 'Authorization') h.value = `Bearer ${NEW_KEY}`;
            });
        }
    }

    // 2. Specialized patch for cargar_telemetria
    if (node.name.includes('cargar_telemetria')) {
        const params = node.parameters;
        params.specifyBody = 'json';
        // We use a robust expression that maps "Carpa 1" to the UUID and handles room_id
        // Note: {sala_o_lote} is the placeholder name in n8n LangChain tools
        const jsonBody = {
            "batch_id": "={{ ['Carpa 1', 'Carpa1', 'carpa 1'].includes($placeholder.sala_o_lote) ? '" + ROOM_UUID + "' : $placeholder.sala_o_lote }}",
            "room_id": "={{ ['Carpa 1', 'Carpa1', 'carpa 1'].includes($placeholder.sala_o_lote) ? '" + ROOM_UUID + "' : $placeholder.sala_o_lote }}",
            "temperature_c": "={{ $placeholder.temperatura }}",
            "humidity_percent": "={{ $placeholder.humedad }}"
        };
        params.jsonBody = JSON.stringify(jsonBody);
        delete params.parametersBody; // Clean up old keypair params
        console.log(`Master Patched node: ${node.name} with JSON Body and mapping.`);
    }

    // 3. Patch Bypass PG node
    if (node.name === 'Bypass PG' && node.parameters.command) {
        node.parameters.command = node.parameters.command
            .replace(/https:\/\/[^/]+\.supabase\.co\/rest\/v1\//g, NEW_URL)
            .replace(/apikey':\s*'[^']+'/g, `apikey': '${NEW_KEY}'`)
            .replace(/Bearer\s+[^']+'/g, `Bearer ${NEW_KEY}'`);
        
        if (!node.parameters.command.includes('room_id')) {
            node.parameters.command = node.parameters.command.replace('batch_id:', 'room_id: \'' + '{{$json.body.batch_id}}' + '\', batch_id:');
        }
        console.log(`Patched Bypass PG node.`);
    }
});

if (wf.nodes.type === 'Buffer') {
    wf.nodes.data = Array.from(Buffer.from(JSON.stringify(nodes), 'utf8'));
} else {
    wf.nodes = nodes;
}

fs.writeFileSync('active_workflow_master_patched.json', JSON.stringify([wf], null, 2));
console.log('Master Patched workflow saved.');
