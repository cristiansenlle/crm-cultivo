const fs = require('fs');
const file = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(file, 'utf8'));

// 1. Update Agent Prompt
const agent = wf.nodes.find(n => n.name === 'AI Agent (Function Calling)');
if (agent) {
    agent.parameters.options = agent.parameters.options || {};
    agent.parameters.options.systemMessage =
        `Eres el Agente de Inteligencia Artificial del CRM Cannabis 360 OS. Tu función es ayudar al cultivador a gestionar su base de datos Supabase, agendar eventos y brindar asistencia técnica. Puedes procesar audios y texto. Usa las herramientas provistas (Tools) para ejecutar acciones cuando el usuario te lo pida explícitamente. Se sumamente profesional, conciso y técnico. Responde en español de Argentina siempre.

REGLAS DE FORMATO Y MANEJO DE ERRORES:
1. Nombres de Lotes: Transforma los nombres coloquiales que te dé el usuario al formato estricto de base de datos. Por ejemplo: "lote 1" -> "LOTE-A01", "lote a2" -> "LOTE-A02", "lote b1" -> "LOTE-B01". 
2. Nombres de Salas: Transforma las salas al formato dash-case. Por ejemplo: "sala veg 1" o "vegetativo 1" -> "sala-veg-1", "sala floracion 2" -> "sala-flo-2", "cuarto madre" -> "sala-madres".
3. Errores de Tools: Si invocas una herramienta y recibes un error en la respuesta, ¡NO respondas con un mensaje genérico como "Hubo un error al reportar"! Analiza el contexto y el posible dato erróneo (probablemente le pasaste un lote_id o sala_id que no existe en el sistema). En caso de error, pídele al usuario amablemente que verifique o te pase el código exacto: "Parece que el sistema no reconoce el lote [lote_id que usaste] o sala [sala_id que usaste]. ¿Podés confirmarme el código exacto guardado en el sistema?".
`;
}

// 2. Add New Tool 'cargar_ventas_pos'
const toolId = 'tool-sales-001';
const existingTool = wf.nodes.find(n => n.id === toolId);
if (!existingTool) {
    wf.nodes.push({
        "parameters": {
            "name": "cargar_ventas_pos",
            "description": "Registra una venta de flores/lote a un cliente. Deduzca el stock del inventario. [LLM Params: {item_id}, {qty}, {price}, {client}]",
            "method": "POST",
            "url": "http://localhost:5678/webhook/agent-sale",
            "sendBody": true,
            "specifyBody": "keypair",
            "placeholderDefinitions": {
                "values": [
                    { "name": "item_id", "description": "ID del lote vendido (ej. LOTE-A01)", "type": "string" },
                    { "name": "qty", "description": "Cantidad en gramos vendidos", "type": "number" },
                    { "name": "price", "description": "Precio o ingreso total de la venta (ingreso neto)", "type": "number" },
                    { "name": "client", "description": "Clasificación del cliente (ej. walk_in, vip_1)", "type": "string" }
                ]
            },
            "parametersBody": {
                "values": [
                    { "name": "item_id", "value": "{item_id}", "valueProvider": "fieldValue" },
                    { "name": "qty", "value": "{qty}", "valueProvider": "fieldValue" },
                    { "name": "price", "value": "{price}", "valueProvider": "fieldValue" },
                    { "name": "client", "value": "{client}", "valueProvider": "fieldValue" }
                ]
            }
        },
        "id": toolId,
        "name": "cargar_ventas_pos",
        "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
        "typeVersion": 1.1,
        "position": [1200, 1500]
    });

    // Conectar el Tool al Agent
    wf.connections[toolId] = wf.connections[toolId] || {};
    wf.connections[toolId]["main"] = wf.connections[toolId]["main"] || [[], []];
    wf.connections[toolId]["main"][0] = wf.connections[toolId]["main"][0] || [];
    wf.connections[toolId]["main"][0].push({
        "node": "AI Agent (Function Calling)",
        "type": "ai_tool",
        "index": 0
    });
}

// 3. Add Webhook and DB nodes for Sales
const whSalesId = 'webhook-agent-sale-node';
if (!wf.nodes.find(n => n.id === whSalesId)) {
    wf.nodes.push({
        "parameters": {
            "httpMethod": "POST",
            "path": "agent-sale",
            "responseMode": "lastNode"
        },
        "id": whSalesId,
        "name": "Webhook Agent Sale",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 1,
        "position": [0, 2600],
        "webhookId": "agent-sale-12345"
    });

    // Update Stock Node
    wf.nodes.push({
        "parameters": {
            "operation": "executeQuery",
            "query": "UPDATE core_inventory_cosechas SET qty = qty - {{$json.body.qty}} WHERE id = '{{$json.body.item_id}}' RETURNING id;"
        },
        "id": "pg-sale-update-stock",
        "name": "PG Sale Update Stock",
        "type": "n8n-nodes-base.postgres",
        "typeVersion": 2.2,
        "position": [300, 2600]
    });

    // Insert Sale Node
    wf.nodes.push({
        "parameters": {
            "operation": "executeQuery",
            "query": "INSERT INTO core_sales (tx_id, item_id, qty_sold, revenue, client, date) VALUES ('TX-AI-' || EXTRACT(EPOCH FROM NOW()), '{{$json.body.item_id}}', {{$json.body.qty}}, {{$json.body.price}}, '{{$json.body.client}}', NOW()) RETURNING id;"
        },
        "id": "pg-sale-insert",
        "name": "PG Sale Insert Record",
        "type": "n8n-nodes-base.postgres",
        "typeVersion": 2.2,
        "position": [600, 2600]
    });

    // Format Response
    wf.nodes.push({
        "parameters": {
            "values": {
                "string": [
                    { "name": "response", "value": "Venta registrada exitosamente. Hemos deducido {{$json.body.qty}}g del {{$json.body.item_id}}." }
                ]
            },
            "options": {}
        },
        "id": "format-sale-response",
        "name": "Format Sale Response",
        "type": "n8n-nodes-base.set",
        "typeVersion": 1,
        "position": [900, 2600]
    });

    // Connections
    wf.connections[whSalesId] = {
        "main": [
            [{ "node": "PG Sale Update Stock", "type": "main", "index": 0 }]
        ]
    };
    wf.connections["PG Sale Update Stock"] = {
        "main": [
            [{ "node": "PG Sale Insert Record", "type": "main", "index": 0 }]
        ]
    };
    wf.connections["PG Sale Insert Record"] = {
        "main": [
            [{ "node": "Format Sale Response", "type": "main", "index": 0 }]
        ]
    };
}

fs.writeFileSync(file, JSON.stringify(wf, null, 2));
console.log('Workflow updated: System message improved, cargar_ventas_pos added along with backend nodes.');
