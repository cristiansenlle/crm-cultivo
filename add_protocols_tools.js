const fs = require('fs');
const file = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/active_wf_patched.json';
const wf = JSON.parse(fs.readFileSync(file, 'utf8'));

// The base URLs need to be what is already set up in the workflow or Supabase directly.
// The tools can be HTTP Requests if the AI Agent connects them to OpenAI/Groq Tool nodes.
// Let's add Tool nodes that connect directly to the Supabase REST API since we don't need a webhook intermediary for basic CRUD!
// Wait! If we connect directly to Supabase REST API from the Langchain HTTP Request tool node, we need the AUTH Header.
// Let's check how `consultar_lotes_groq` works.
const existingLotesTool = wf.nodes.find(n => n.name === 'consultar_lotes_groq' || n.name === 'consultar_lotes');
const SUPABASE_URL = existingLotesTool ? existingLotesTool.parameters.url.replace('/core_batches', '') : 'https://dvvfdsaqvcyftaaronhd.supabase.co/rest/v1';

// find apikey from existing tool
let SUPABASE_KEY = '';
if (existingLotesTool && existingLotesTool.parameters.parametersHeader) {
    const hk = existingLotesTool.parameters.parametersHeader.values.find(v => v.name === 'apikey');
    if (hk) SUPABASE_KEY = hk.value;
}

if (!SUPABASE_KEY) {
   // Let's try to extract from another node
   const roomTool = wf.nodes.find(n => n.parameters.url && n.parameters.url.includes('core_rooms'));
   if (roomTool && roomTool.parameters.parametersHeader) {
      const hk = roomTool.parameters.parametersHeader.values.find(v => v.name === 'apikey');
      if (hk) SUPABASE_KEY = hk.value;
   }
}

// 1. Add `consultar_protocolos` tool
const toolGetId = 'tool-protocols-get-001';
const existingGet = wf.nodes.find(n => n.id === toolGetId);
if (!existingGet) {
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
}

// 2. Add `crear_protocolo` tool
const toolPostId = 'tool-protocols-post-001';
const existingPost = wf.nodes.find(n => n.id === toolPostId);
if (!existingPost) {
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
}

// Connect tools to both Agents (Groq and OpenRouter)
wf.nodes.forEach(agent => {
    if (agent.type.includes('agent') || agent.name.toLowerCase().includes('agent')) {
        wf.connections[toolGetId] = wf.connections[toolGetId] || {};
        wf.connections[toolGetId]["main"] = wf.connections[toolGetId]["main"] || [[], []];
        wf.connections[toolGetId]["main"][0] = wf.connections[toolGetId]["main"][0] || [];
        
        const alreadyConnectedGet = wf.connections[toolGetId]["main"][0].find(c => c.node === agent.name);
        if (!alreadyConnectedGet) {
            wf.connections[toolGetId]["main"][0].push({ "node": agent.name, "type": "ai_tool", "index": 0 });
        }

        wf.connections[toolPostId] = wf.connections[toolPostId] || {};
        wf.connections[toolPostId]["main"] = wf.connections[toolPostId]["main"] || [[], []];
        wf.connections[toolPostId]["main"][0] = wf.connections[toolPostId]["main"][0] || [];
        
        const alreadyConnectedPost = wf.connections[toolPostId]["main"][0].find(c => c.node === agent.name);
        if (!alreadyConnectedPost) {
            wf.connections[toolPostId]["main"][0].push({ "node": agent.name, "type": "ai_tool", "index": 0 });
        }

        // Update System prompt
        if (agent.parameters && agent.parameters.options && agent.parameters.options.systemMessage) {
            let msg = agent.parameters.options.systemMessage;
            if (!msg.includes("PROTOCOLOS Y RECETAS")) {
                const protocolRule = `
━━━━━━━━━━━━━━━━━━━━━━━━
📖 PROTOCOLOS Y RECETAS (IMPORTANTE)
━━━━━━━━━━━━━━━━━━━━━━━━
• Si el usuario te pregunta por procedimientos o dice "¿Cómo preparamos el sustrato?", usa "consultar_protocolos" para leer la base de conocimiento interna.
• Si el usuario te dicta una nueva regla o actualización de procedimiento, usa "crear_protocolo".
`;
                msg = msg + "\n\n" + protocolRule;
                agent.parameters.options.systemMessage = msg;
            }
        }
    }
});

// Save to the final requested filename
const targetFile = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow-PROTOCOLOS-2026-03-21.json';
fs.writeFileSync(targetFile, JSON.stringify(wf, null, 2));

console.log("Successfully injected tools to n8n-crm-cannabis-workflow-PROTOCOLOS-2026-03-21.json");
