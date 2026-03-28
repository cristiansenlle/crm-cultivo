const fs = require('fs');
const file = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(file, 'utf8'));

// ======================================================
// FIX 1: Fix cosecha_humeda stage value ({cosecha} -> statically 'cosecha')
// ======================================================
const cosechaHumeda = wf.nodes.find(n => n.name === 'cosecha_humeda');
if (cosechaHumeda && cosechaHumeda.parameters.parametersBody) {
    for (const bp of cosechaHumeda.parameters.parametersBody.values) {
        if (bp.name === 'stage' && bp.value === '{cosecha}') {
            bp.value = 'cosecha';
            console.log('Fixed: cosecha_humeda stage = cosecha (static)');
        }
    }
}

// ======================================================
// FIX 2: Update System Prompt with list of known lote/sala codes
// ======================================================
const agent = wf.nodes.find(n => n.name === 'AI Agent (Function Calling)');
if (agent && agent.parameters.options) {
    agent.parameters.options.systemMessage =
        `Eres el Agente de Inteligencia Artificial del CRM Cannabis 360 OS. Tu función es ayudar al cultivador a gestionar su base de datos Supabase, agendar eventos y brindar asistencia técnica. Puedes procesar audios y texto. Usa las herramientas provistas (Tools) para ejecutar acciones cuando el usuario te lo pida explícitamente. Se sumamente profesional, conciso y técnico. Responde en español de Argentina siempre.

REGLAS DE FORMATO ESTRICTAS:
1. Nombres de Lotes: El formato estricto de la base de datos es LOTE-X00 (ej. "lote 1" -> "LOTE-A01", "lote 2" -> "LOTE-A02", "lote b1" -> "LOTE-B01"). SIEMPRE usa este formato al llamar Tools.
2. Nombres de Salas: Usa el formato con guiones (ej. "sala veg 1" -> "sala-veg-1", "sala floracion" -> "sala-flo-1", "cuarto madre" -> "sala-madres", "vegetativo" -> "sala-veg-1").
3. Si el usuario pregunta qué lotes o salas existen, usá la herramienta "consultar_lotes" para responderle con los datos reales de la base de datos.
4. Errores de Tools: Si una herramienta devuelve un error o un array vacío, NO respondas con mensajes genéricos. Usá la herramienta "consultar_lotes" para listar los lotes/salas disponibles y ayudar al usuario a elegir el correcto.
`;
    console.log('Updated: System prompt updated with lote/sala format rules and error recovery via consultar_lotes.');
}

// ======================================================
// FIX 3: Add GET Tool 'consultar_lotes'
// ======================================================
const toolReadId = 'tool-read-lotes-001';
if (!wf.nodes.find(n => n.id === toolReadId)) {
    wf.nodes.push({
        "parameters": {
            "name": "consultar_lotes",
            "description": "Consulta y lista todos los lotes de cultivo activos con su cepa, estado y ubicación de sala. Usá esto cuando el usuario pregunta qué lotes tiene o cuando un lote no es reconocido y necesitás mostrarle los códigos válidos.",
            "method": "GET",
            "url": "https://dvvfdsaqvcyftaaronhd.supabase.co/rest/v1/core_batches?select=id,strain,stage,location&order=id.asc",
            "sendHeaders": true,
            "options": {},
            "parametersHeaders": {
                "values": [
                    { "name": "apikey", "value": "sbp_26b273690ba8b9aebca57a19a9fb6dc3e9cc9089", "valueProvider": "fieldValue" },
                    { "name": "Authorization", "value": "Bearer sbp_26b273690ba8b9aebca57a19a9fb6dc3e9cc9089", "valueProvider": "fieldValue" }
                ]
            }
        },
        "id": toolReadId,
        "name": "consultar_lotes",
        "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
        "typeVersion": 1.1,
        "position": [1050, 800]
    });

    // Connect to Agent
    wf.connections[toolReadId] = {
        "main": [
            [],
            [{ "node": "AI Agent (Function Calling)", "type": "ai_tool", "index": 0 }]
        ]
    };
    console.log('Added: consultar_lotes GET tool');
}

fs.writeFileSync(file, JSON.stringify(wf, null, 2));
console.log('Done. Workflow saved.');
