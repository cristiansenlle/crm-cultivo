const fs = require('fs');

const NEW_URL = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/";
const NEW_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8";
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

// 1. Update AI Agent Prompt to enforce UUIDs
const agent = nodes.find(n => n.name === 'AI Agent (Function Calling)');
if (agent && agent.parameters && agent.parameters.options && agent.parameters.options.systemMessage) {
    let prompt = agent.parameters.options.systemMessage;
    const patch = `\n━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ REGLAS DE TELEMETRÍA (¡CRÍTICO!)\n━━━━━━━━━━━━━━━━━━━━━━━━\n• Cuando el usuario mencione una SALA (ej: Carpa 1), DEBÉS usar el room_uuid (ej: ${ROOM_UUID}) para el parámetro 'sala_o_lote' del tool cargar_telemetria.\n• NUNCA pases el nombre legible (Carpa 1) al tool. Siempre pasá el UUID que obtengas de 'consultar_salas'.\n`;
    if (!prompt.includes('REGLAS DE TELEMETRÍA')) {
        agent.parameters.options.systemMessage = prompt + patch;
        console.log('Patched AI Agent System Message.');
    }
}

// 2. Patch Tools
nodes.forEach(node => {
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

    if (node.name.includes('cargar_telemetria')) {
        const params = node.parameters;
        // Keep keypair but ensure room_id is added with $ notation just in case
        if (params.parametersBody && params.parametersBody.values) {
            const hasRoomId = params.parametersBody.values.some(v => v.name === 'room_id');
            if (!hasRoomId) {
                params.parametersBody.values.push({
                    name: "room_id",
                    value: "{sala_o_lote}",
                    valueProvider: "fieldValue"
                });
            }
        }
        console.log(`Patched ${node.name} tool.`);
    }
});

if (wf.nodes.type === 'Buffer') {
    wf.nodes.data = Array.from(Buffer.from(JSON.stringify(nodes), 'utf8'));
} else {
    wf.nodes = nodes;
}

fs.writeFileSync('active_workflow_final_patched.json', JSON.stringify([wf], null, 2));
console.log('Final Patched workflow saved.');
