const fs = require('fs');

const sourceFile = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/active_wf_patched.json';
const targetFile = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow-PROTOCOLOS-2026-03-21.json';

const wf = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));

// The base URLs need to be what is already set up in the workflow or Supabase directly.
const SUPABASE_URL = 'https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1';
const SUPABASE_KEY = 'HIDDEN_SECRET_BY_AI';

const toolGetId = 'tool-protocols-get-001';
const toolPostId = 'tool-protocols-post-001';

// Remove any existing bad tools just in case
wf.nodes = wf.nodes.filter(n => n.id !== toolGetId && n.id !== toolPostId);

// 1. Add `consultar_protocolos` tool
wf.nodes.push({
    "parameters": {
        "name": "consultar_protocolos",
        "description": "Busca y devuelve los protocolos, recetas de riego o SOPs (Standard Operating Procedures) de la empresa para todas las fases del cultivo. Úsalo si el usuario pregunta '¿cómo germinamos las semillas?' o '¿cuál es nuestra receta de vegetativo?'. No recibe parámetros. Devuelve una lista de todos los protocolos.",
        "method": "GET",
        "url": `${SUPABASE_URL}/core_protocols`,
        "sendHeaders": true,
        "headerParameters": {
            "parameters": [
                { "name": "apikey", "value": SUPABASE_KEY },
                { "name": "Authorization", "value": `Bearer ${SUPABASE_KEY}` }
            ]
        }
    },
    "id": toolGetId,
    "name": "consultar_protocolos",
    "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
    "typeVersion": 1.1,
    "position": [600, 1800]
});

// 2. Add `crear_protocolo` tool
wf.nodes.push({
    "parameters": {
        "name": "crear_protocolo",
        "description": "Crea una nueva regla, receta de cultivo o protocolo estándar de la empresa. Úsalo cuando el usuario dicte un nuevo procedimiento (ej: 'Nuestra nueva regla de secado es max 60% humedad por 10 dias'). [LLM Params: {title}, {stage}, {topic}, {content}]",
        "method": "POST",
        "url": `${SUPABASE_URL}/core_protocols`,
        "sendHeaders": true,
        "headerParameters": {
            "parameters": [
                { "name": "apikey", "value": SUPABASE_KEY },
                { "name": "Authorization", "value": `Bearer ${SUPABASE_KEY}` },
                { "name": "Prefer", "value": "return=representation" },
                { "name": "Content-Type", "value": "application/json" }
            ]
        },
        "sendBody": true,
        "specifyBody": "keypair",
        "placeholderDefinitions": {
            "values": [
                { "name": "title", "description": "Título descriptivo corto del protocolo", "type": "string" },
                { "name": "stage", "description": "Etapa (Seleccionar una: General, Germinación, Vegetativo, Floración, Secado / Curado)", "type": "string" },
                { "name": "topic", "description": "Tema (Seleccionar una: Nutrición / Riego, Trasplantes, Poda / Defoliación, MIP / Plagas, Parámetros Ambientales, Otros)", "type": "string" },
                { "name": "content", "description": "Instrucciones paso a paso detalladas", "type": "string" }
            ]
        },
        "parametersBody": {
            "values": [
                { "name": "title", "value": "{title}", "valueProvider": "fieldValue" },
                { "name": "stage", "value": "{stage}", "valueProvider": "fieldValue" },
                { "name": "topic", "value": "{topic}", "valueProvider": "fieldValue" },
                { "name": "content", "value": "{content}", "valueProvider": "fieldValue" }
            ]
        }
    },
    "id": toolPostId,
    "name": "crear_protocolo",
    "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
    "typeVersion": 1.1,
    "position": [600, 2000]
});


// Reset corrupted connections to these tools
wf.connections[toolGetId] = { "main": [[], []] };
wf.connections[toolPostId] = { "main": [[], []] };

// Safely identify the exact AI Agent nodes
const aiAgents = wf.nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.agent' || n.type === '@n8n/n8n-nodes-langchain.agentTool');

aiAgents.forEach(agent => {
    // Add connection for GET
    wf.connections[toolGetId]["main"][0].push({ "node": agent.name, "type": "ai_tool", "index": 0 });
    // Add connection for POST
    wf.connections[toolPostId]["main"][0].push({ "node": agent.name, "type": "ai_tool", "index": 0 });

    // Update System prompt safely
    if (agent.parameters && agent.parameters.options) {
        let msg = agent.parameters.options.systemMessage || "";
        if (!msg.includes("PROTOCOLOS Y RECETAS")) {
            const protocolRule = `
━━━━━━━━━━━━━━━━━━━━━━━━
📖 PROTOCOLOS Y RECETAS (IMPORTANTE)
━━━━━━━━━━━━━━━━━━━━━━━━
• Si el usuario te pregunta por procedimientos o dice "¿Cómo preparamos el sustrato?", usa "consultar_protocolos" para leer la base de conocimiento interna de recetas de la empresa.
• Si el usuario te dicta una nueva regla o actualización de procedimiento, usa "crear_protocolo".
`;
            msg = msg + "\n\n" + protocolRule;
            agent.parameters.options.systemMessage = msg;
        }
    }
});

fs.writeFileSync(targetFile, JSON.stringify(wf, null, 2));
console.log("Successfully rebuilt tools with correct URL, Headers, and exact AI Agent connections.");
