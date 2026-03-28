
const fs = require("fs");
const path = require("path");

const wfPath = path.join(__dirname, "n8n-crm-cannabis-workflow.json");
const data = JSON.parse(fs.readFileSync(wfPath, "utf-8"));

// 1. Encontrar los agentes
const agent1 = data.nodes.find(n => n.name === "AI Agent (Function Calling)");
const agent2 = data.nodes.find(n => n.name === "AI Agent (Groq Fallback)");

if (!agent1 || !agent2) { console.error("Agents not found!"); process.exit(1); }

// Configurar agent 1 (Llama 70B) para que siga en caso de fallo
agent1.continueOnFail = true;
agent1.onError = "continueErrorOutput";

// 2. Crear Router para verificar si hubo error si no existe
let routerNode = data.nodes.find(n => n.name === "If Agent 1 Failed");
if (!routerNode) {
    routerNode = {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "c1",
              "leftValue": "={{ $json.error ? true : false }}",
              "rightValue": true,
              "operator": {
                "type": "boolean",
                "operation": "true",
                "singleValue": true
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "id": "if-agent-error-router",
      "name": "If Agent 1 Failed",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.2,
      "position": [ 1200, 450 ]
    };
    data.nodes.push(routerNode);
}

// 3. Reconectar Agentes y Moverlos
const formatterNode = data.nodes.find(n => n.name === "Format WA Response");
if (formatterNode) formatterNode.position = [1600, 450];
agent2.position = [1400, 250];

data.nodes = data.nodes.filter(n => n.name !== "If Gemini Error?"); 

// Agente 1 conecta a -> IF Router
if (!data.connections["AI Agent (Function Calling)"]) data.connections["AI Agent (Function Calling)"] = { "main": [ [] ] };
data.connections["AI Agent (Function Calling)"].main[0] = [
    {
        "node": "If Agent 1 Failed",
        "type": "main",
        "index": 0
    }
];

// IF Router True (Hubo error) -> Agente 2
// IF Router False (No hubo error) -> Formatter
data.connections["If Agent 1 Failed"] = {
    "main": [
        [
            {
                "node": "AI Agent (Groq Fallback)",
                "type": "main",
                "index": 0
            }
        ],
        [
            {
                "node": "Format WA Response",
                "type": "main",
                "index": 0
            }
        ]
    ]
};

// Agente 2 -> Formatter
// Agent 2 se llama "AI Agent (Groq Fallback)" pero OJO n8n Connections usa el NAME del source node
data.connections["AI Agent (Groq Fallback)"] = {
    "main": [
        [
            {
                "node": "Format WA Response",
                "type": "main",
                "index": 0
            }
        ]
    ]
};

// 4. Arreglar Tools y Conectarlas a ambos agentes
let toolNodes = data.nodes.filter(n => n.type === "@n8n/n8n-nodes-langchain.toolHttpRequest" || n.name.startsWith("consultar_") || n.name.startsWith("cargar_"));

// Agregar consultar_clientes
const hasClientes = data.nodes.find(n => n.name === "consultar_clientes");
if (!hasClientes) {
    const ventasNode = data.nodes.find(n => n.name === "consultar_ventas");
    if (ventasNode) {
        const clientesNode = JSON.parse(JSON.stringify(ventasNode));
        clientesNode.id = "tool-read-clientes-001";
        clientesNode.name = "consultar_clientes";
        clientesNode.parameters.name = "consultar_clientes";
        clientesNode.parameters.description = "Lista todos los clientes registrados y sus compras recientes. Usá este tool para responder quiénes compran, o listarlos.";
        clientesNode.parameters.url = "https://dvvfdsaqvcyftaaronhd.supabase.co/rest/v1/core_sales?select=customer_name,client,revenue,item_id,date&order=date.desc&limit=100";
        clientesNode.position[1] += 150; 
        data.nodes.push(clientesNode);
        toolNodes.push(clientesNode);
        data.connections["consultar_clientes"] = { "ai_tool": [ [] ] };
    }
}

// Fix bugs en todas las tools
toolNodes.forEach(tool => {
    // A) Quitar price de placeholders de cargar_ventas_pos
    if (tool.name === "cargar_ventas_pos" && tool.parameters.placeholderDefinitions?.values) {
        tool.parameters.placeholderDefinitions.values = tool.parameters.placeholderDefinitions.values.filter(p => p.name !== "price");
    }
    // B) Quitar filtro_opcional
    if (tool.parameters.placeholderDefinitions?.values) {
        tool.parameters.placeholderDefinitions.values = tool.parameters.placeholderDefinitions.values.filter(p => p.name !== "filtro_opcional");
    }
    // C) Fix consultar_ventas URL (agregar customer_name)
    if (tool.name === "consultar_ventas") {
        if (tool.parameters.url && !tool.parameters.url.includes("customer_name")) {
            tool.parameters.url = tool.parameters.url.replace("client,date", "client,customer_name,date").replace("limit=20", "limit=50");
        }
    }
    // D) Evitar envios de JSON stringify vacio en tools GET que causan error 400
    if (tool.parameters.method === "GET") {
        tool.parameters.sendBody = false;
        tool.parameters.specifyBody = undefined;
    }
    
    // E) Conectar a AI Agent (Groq Fallback) y AI Agent (Function Calling)
    if (!data.connections[tool.name]) data.connections[tool.name] = { "ai_tool": [ [] ] };
    const conns = data.connections[tool.name].ai_tool[0];
    if (!conns.find(c => c.node === "AI Agent (Groq Fallback)")) {
        conns.push({"node": "AI Agent (Groq Fallback)", "type": "ai_tool", "index": 0});
    }
    if (!conns.find(c => c.node === "AI Agent (Function Calling)")) {
        conns.push({"node": "AI Agent (Function Calling)", "type": "ai_tool", "index": 0});
    }
});

// Limpiar el system prompt del agente 1
let prompt1 = agent1.parameters.options.systemMessage || "";
const lineToRemove = "• Los tools de consultar_* ahora tienen el parametro {filtro_opcional}. Ponele \" \" (un espacio) si querés todos, o la palabra clave que buscás.";
prompt1 = prompt1.replace(lineToRemove, "");
if (!prompt1.includes("consultar_clientes")) {
    prompt1 = prompt1.replace(/\• "¿Cuánto vendí\?" ? consultar_ventas/g, "• \"¿Cuánto vendí?\" ? consultar_ventas\n• \"¿Qué clientes tengo?\" ? consultar_clientes");
}
agent1.parameters.options.systemMessage = prompt1;

// Tambien copiar el prompt al agente 2
agent2.parameters.options.systemMessage = prompt1;


fs.writeFileSync(path.join(__dirname, "n8n-crm-cannabis-workflow.json"), JSON.stringify(data, null, 2));
console.log("Original Workflow Patched Succesfully with existing OpenRouter agent + Node Fixes");

