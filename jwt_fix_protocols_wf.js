const fs = require('fs');

const sourceFile = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/active_wf_patched.json';
const targetFile = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow-PROTOCOLOS-2026-03-21.json';

const wf = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));

// Automatically grab the Real Anon / Service Role JWT
const existingNode = wf.nodes.find(n => n.name === 'consultar_ventas');
const jwtToken = existingNode.parameters.parametersHeaders.values.find(v => v.name === 'apikey').value;

const SUPABASE_URL = 'https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1';
const SUPABASE_KEY = jwtToken;

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
        "url": `${SUPABASE_URL}/core_protocols?select=*&order=created_at.desc`,
        "sendHeaders": true,
        "parametersHeaders": {
            "values": [
                { "name": "apikey", "value": SUPABASE_KEY, "valueProvider": "fieldValue" },
                { "name": "Authorization", "value": `Bearer ${SUPABASE_KEY}`, "valueProvider": "fieldValue" }
            ]
        },
        "placeholderDefinitions": { "values": [] }
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
        "parametersHeaders": {
            "values": [
                { "name": "apikey", "value": SUPABASE_KEY, "valueProvider": "fieldValue" },
                { "name": "Authorization", "value": `Bearer ${SUPABASE_KEY}`, "valueProvider": "fieldValue" },
                { "name": "Prefer", "value": "return=representation", "valueProvider": "fieldValue" },
                { "name": "Content-Type", "value": "application/json", "valueProvider": "fieldValue" }
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

// Fix Connections mapping using exact Node names
delete wf.connections[toolGetId]; 
delete wf.connections[toolPostId];
delete wf.connections["consultar_protocolos"]; 
delete wf.connections["crear_protocolo"];

// Safely identify the exact AI Agent nodes
const aiAgents = wf.nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.agent' || n.type === '@n8n/n8n-nodes-langchain.agentTool');

wf.connections["consultar_protocolos"] = { "ai_tool": [[], []] };
wf.connections["crear_protocolo"] = { "ai_tool": [[], []] };

aiAgents.forEach(agent => {
    // Add connection for GET
    wf.connections["consultar_protocolos"]["ai_tool"][0].push({ "node": agent.name, "type": "ai_tool", "index": 0 });
    // Add connection for POST
    wf.connections["crear_protocolo"]["ai_tool"][0].push({ "node": agent.name, "type": "ai_tool", "index": 0 });

    // Update System prompt safely
    if (agent.parameters && agent.parameters.options) {
        let msg = agent.parameters.options.systemMessage || "";
        if (!msg.includes("PROTOCOLOS Y RECETAS")) {
            const protocolRule = `
━━━━━━━━━━━━━━━━━━━━━━━━
📖 PROTOCOLOS Y RECETAS (IMPORTANTE)
━━━━━━━━━━━━━━━━━━━━━━━━
• Si el usuario te pregunta por procedimientos o dice "¿Cómo preparamos el sustrato?", usa la tool "consultar_protocolos" para leer la base de conocimiento interna de recetas de la empresa.
• Si el usuario te dicta una nueva regla o actualización de procedimiento, usa "crear_protocolo".
`;
            msg = msg + "\n\n" + protocolRule;
            agent.parameters.options.systemMessage = msg;
        }
    }
});

fs.writeFileSync(targetFile, JSON.stringify(wf, null, 2));
console.log("Successfully fixed JWT Token for Data API Authentication!");
