
const fs = require("fs");
const path = require("path");

const wfPath = path.join(__dirname, "n8n-crm-cannabis-workflow-updated-v3.json");
const data = JSON.parse(fs.readFileSync(wfPath, "utf-8"));

// 1. Encontrar el Agente Primario
const agent1 = data.nodes.find(n => n.name === "AI Agent (Function Calling)");
if (!agent1) { console.error("Agent 1 not found"); process.exit(1); }

// Configurar agent 1 (Llama 70B)
agent1.continueOnFail = true;
agent1.onError = "continueErrorOutput";

// 2. Crear Router para verificar si hubo error
const routerNode = {
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
  "position": [
    1200,
    450
  ]
};

// Mover el formatter
const formatterNode = data.nodes.find(n => n.name === "Format WA Response");
if (formatterNode) {
    formatterNode.position = [1600, 450];
}

// Mover el If Gemini Error original si existe y eliminarlo para simplificar el flujo
data.nodes = data.nodes.filter(n => n.name !== "If Gemini Error?"); 

// 3. Crear el Agente Secundario (Fallback: Mixtral o Llama 8B)
const agent2 = JSON.parse(JSON.stringify(agent1));
agent2.id = "agent-fallback-002";
agent2.name = "Fallback Agent (Mixtral 8x7B)";
agent2.position = [1400, 250];

// Cambiar el modelo de Agent 2 a Mixtral (mas permisivo en rate limits) o GPT-4o-mini si tuvieramos OpenAI. Vamos a usar Mixtral de Groq.
// El modelo especificio está en el nodo de LLM conectado.
// Busco el nodo LLM actual
const llmNode = data.nodes.find(n => n.type === "@n8n/n8n-nodes-langchain.lmChatGroq");
const llmNode2 = JSON.parse(JSON.stringify(llmNode));
llmNode2.id = "llm-groq-fallback";
llmNode2.name = "Groq Fallback (Mixtral)";
llmNode2.parameters.model = "mixtral-8x7b-32768";
llmNode2.position = [1350, 450];

// Clonar la memoria
const memoryNode = data.nodes.find(n => n.type === "@n8n/n8n-nodes-langchain.memoryBufferWindow");
const memoryNode2 = JSON.parse(JSON.stringify(memoryNode));
memoryNode2.id = "memory-fallback-002";
memoryNode2.name = "Memory Fallback";
memoryNode2.position = [1350, 550];

// Agegar nuevos nodos
data.nodes.push(routerNode, agent2, llmNode2, memoryNode2);

// 4. Reconectar Todo
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
                "node": "Fallback Agent (Mixtral 8x7B)",
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
data.connections["Fallback Agent (Mixtral 8x7B)"] = {
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

// Conectar Input al Agente 2 (Mismo input que el Agente 1)
// Quien llamaba al Agente 1? El nodo IF Audio o Texto (por ej).
// Vamos a buscar todas las conexiones que iban a Agent 1 y duplicarlas para Agent 2? NO, Agent 2 se dispara desde el IF Router. 
// Ah, los Agentes en Langchain consumen el trigger anterior de la cadena.

// Herramientas: Las herramientas estaban conectadas a Agent 1. Hay que conectarlas TODAS a Agent 2 tambien.
const toolNodes = data.nodes.filter(n => n.type === "@n8n/n8n-nodes-langchain.toolHttpRequest" || n.name.startsWith("consultar_") || n.name.startsWith("cargar_"));
toolNodes.forEach(tool => {
    if (!data.connections[tool.name]) data.connections[tool.name] = { "ai_tool": [ [] ] };
    // Chequear si Agent 2 ya esta
    const isConn = data.connections[tool.name].ai_tool[0].find(c => c.node === "Fallback Agent (Mixtral 8x7B)");
    if (!isConn) {
        data.connections[tool.name].ai_tool[0].push({
            "node": "Fallback Agent (Mixtral 8x7B)",
            "type": "ai_tool",
            "index": 0
        });
    }
});

// Conectar LLM y Memoria a Agent 2
data.connections["Groq Fallback (Mixtral)"] = {
    "ai_languageModel": [
        [
            {
                "node": "Fallback Agent (Mixtral 8x7B)",
                "type": "ai_languageModel",
                "index": 0
            }
        ]
    ]
};

data.connections["Memory Fallback"] = {
    "ai_memory": [
        [
            {
                "node": "Fallback Agent (Mixtral 8x7B)",
                "type": "ai_memory",
                "index": 0
            }
        ]
    ]
};

// 5. Arreglar que "consultar_lotes" y "consultar_stock_cosechas" devuelvan data correctamente
// En n8n, el JSON Body Request a Supabase desde un GET arroja error o ignora el body.
// Por las dudas, aseguramos que "sendBody" sea false para herramientas GET.
toolNodes.forEach(tool => {
    if (tool.parameters.method === "GET") {
        tool.parameters.sendBody = false;
        tool.parameters.specifyBody = undefined;
        // El bot decia "Lo siento, pero no hay lotes registrados", eso a veces es porque la BD devuelve un Array [] o el prompt no esta claro.
    }
});

// Forzar guardado
fs.writeFileSync(path.join(__dirname, "n8n-crm-cannabis-workflow-updated-v4.json"), JSON.stringify(data, null, 2));
console.log("JSON Fallback V4 Fixed successfully.");

