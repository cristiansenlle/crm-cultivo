
const fs = require("fs");
const path = require("path");

const wfPath = path.join(__dirname, "n8n-crm-cannabis-workflow.json");
const data = JSON.parse(fs.readFileSync(wfPath, "utf-8"));

// Encontrar todas las tools consultar_* y agregarles el filtro_opcional
data.nodes.forEach(node => {
    if (node.type === "@n8n/n8n-nodes-langchain.toolHttpRequest" && node.name && node.name.startsWith("consultar_")) {
        // Asegurar que placeholderDefinitions exista
        if (!node.parameters.placeholderDefinitions) {
            node.parameters.placeholderDefinitions = { values: [] };
        }
        
        const placeholders = node.parameters.placeholderDefinitions.values;
        const hasFiltro = placeholders.find(p => p.name === "filtro_opcional");
        if (!hasFiltro) {
            placeholders.push({
                name: "filtro_opcional",
                description: "Palabra clave para filtrar o dejar un espacio en blanco para traer todo",
                type: "string"
            });
        }
        
        // Si es consultar_ventas, asegurarnos que en el URL traiga customer_name
        if (node.name === "consultar_ventas") {
            if (node.parameters.url && !node.parameters.url.includes("customer_name")) {
                node.parameters.url = node.parameters.url.replace("client,date", "client,customer_name,date").replace("limit=20", "limit=50");
            }
        }
    }
    
    // Si es el nodo del AI Agent, arreglar el prompt para darle mas contexto
    if (node.name === "AI Agent (Function Calling)") {
       let prompt = node.parameters.options.systemMessage || "";
       if (!prompt.includes("consultar_clientes")) {
           prompt = prompt.replace("• \"¿Cuánto vendí?\" ? consultar_ventas", "• \"¿Cuánto vendí?\" ? consultar_ventas\n• \"¿Qué clientes tengo?\" ? consultar_clientes");
           node.parameters.options.systemMessage = prompt;
       }
    }
});

// Buscar si ya existe consultar_clientes
const hasClientes = data.nodes.find(n => n.name === "consultar_clientes");
if (!hasClientes) {
    // Buscar la de ventas para copiar su config y posicion
    const ventasNode = data.nodes.find(n => n.name === "consultar_ventas");
    if (ventasNode) {
        const clientesNode = JSON.parse(JSON.stringify(ventasNode));
        clientesNode.id = "tool-read-clientes-001";
        clientesNode.name = "consultar_clientes";
        clientesNode.parameters.name = "consultar_clientes";
        clientesNode.parameters.description = "Lista todos los clientes registrados y sus compras recientes (obtenidas desde la tabla de ventas). Usá este tool para responder quiénes compran, qué compraron y agrupar por customer_name.";
        clientesNode.parameters.url = "https://dvvfdsaqvcyftaaronhd.supabase.co/rest/v1/core_sales?select=customer_name,client,revenue,item_id,date&order=date.desc&limit=100";
        clientesNode.position[1] += 150; // Bajar en el lienzo
        
        data.nodes.push(clientesNode);
        
        // Conectar el nodo al agente
        // Buscar la conexion del consultar_ventas y replicarla
        if (data.connections && data.connections["consultar_ventas"]) {
             data.connections["consultar_clientes"] = JSON.parse(JSON.stringify(data.connections["consultar_ventas"]));
        } else {
             // asumiendo formato de n8n, las tools se conectan al agente al reves o el agente a la tool
             // Las tools en un agente van al input del agente, veamos el formato de conexiones
             // en Langchain node las tools se conectan a su entrada index 1
        }
    }
}

// Conectar tool-read-clientes-001 al agente
// Primero encontramos el agente
const agentNodeId = data.nodes.find(n => n.name === "AI Agent (Function Calling)").name;
// En n8n, las conexiones son un objeto donde la key es el source node name
if (!data.connections["consultar_clientes"]) {
    data.connections["consultar_clientes"] = {
        "ai_tool": [
            [
                {
                    "node": "AI Agent (Function Calling)",
                    "type": "ai_tool",
                    "index": 0
                }
            ]
        ]
    };
}

fs.writeFileSync(path.join(__dirname, "n8n-crm-cannabis-workflow-updated.json"), JSON.stringify(data, null, 2));
console.log("JSON Updated Successfully!");

