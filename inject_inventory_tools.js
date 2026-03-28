const fs = require('fs');

const originalFile = 'n8n-crm-cannabis-workflow-PROTOCOLOS-2026-03-21.json';
const newFile = 'n8n-crm-cannabis-workflow-INVENTARIO-2026-03-22.json';

const wf = JSON.parse(fs.readFileSync(originalFile, 'utf8'));

// 1. Append math instructions to prompt
const promptAddon = `\n\n[REGLAS MUY IMPORTANTES DE INVENTARIO]\nCuando el usuario te pida VENDER o APLICAR/REGAR productos:\n1. Primero usa consultar_stock_cosechas o consultar_insumos para obtener el ID real y el stock actual.\n2. Haz la matemática: stock_actual - cantidad_consumida = NUEVO_STOCK.\n3. OBLIGATORIAMENTE DEBES llamar a "actualizar_stock_cosecha" (si es venta) o "actualizar_stock_insumo" (si es riego/plaga) para guardar el NUEVO_STOCK final en la base de datos! Si no haces esto, engañarás al usuario.`;

wf.nodes.forEach(n => {
    if (n.name.includes('OpenRouter') || n.name.includes('Groq (Llama')) {
        let options = n.parameters.options || {};
        if (options.systemMessage) {
            if (!options.systemMessage.includes('REGLAS MUY IMPORTANTES DE INVENTARIO')) {
                options.systemMessage += promptAddon;
            }
        } else if (n.parameters.systemMessage) {
            if (!n.parameters.systemMessage.includes('REGLAS MUY IMPORTANTES DE INVENTARIO')) {
                n.parameters.systemMessage += promptAddon;
            }
        } else {
            options.systemMessage = promptAddon;
            n.parameters.options = options;
        }
    }
});

function createTool(name, url, bodyDef, placeholders, yOffset) {
    return {
        "parameters": {
            "method": "PATCH",
            "url": url,
            "sendHeaders": true,
            "parametersHeaders": {
                "values": [
                    { "name": "apikey", "valueProvider": "fieldValue", "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8" },
                    { "name": "Authorization", "valueProvider": "fieldValue", "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8" },
                    { "name": "Content-Type", "valueProvider": "fieldValue", "value": "application/json" },
                    { "name": "Prefer", "valueProvider": "fieldValue", "value": "return=representation" }
                ]
            },
            "sendBody": true,
            "specifyBody": "json",
            "jsonBody": bodyDef,
            "placeholderDefinitions": { "values": placeholders }
        },
        "id": "c8db" + Math.random().toString(16).substring(2, 10),
        "name": name,
        "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
        "typeVersion": 1.1,
        "position": [1080, yOffset]
    };
}

const urlQuimico = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/core_inventory_quimicos?id=eq.{insumo_id}";
const urlCosecha = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/core_inventory_cosechas?id=eq.{cosecha_id}";

const toolInsumo = createTool('actualizar_stock_insumo', urlQuimico, '{ "qty": {nuevo_stock} }', [
    { name: "insumo_id", description: "ID del insumo obtenido en consultar_insumos", type: "string" },
    { name: "nuevo_stock", description: "Cantidad total matemática resultante luego de restar lo usado", type: "number" }
], -2000);

const toolInsumoGroq = createTool('actualizar_stock_insumo_groq', urlQuimico, '{ "qty": {nuevo_stock} }', [
    { name: "insumo_id", description: "ID del insumo obtenido en consultar_insumos", type: "string" },
    { name: "nuevo_stock", description: "Cantidad total matemática resultante", type: "number" }
], -2200);

const toolCosecha = createTool('actualizar_stock_cosecha', urlCosecha, '{ "qty": {nuevo_stock} }', [
    { name: "cosecha_id", description: "ID de la cosecha ej. LOTE-A01", type: "string" },
    { name: "nuevo_stock", description: "Cantidad matemática resultante en gramos", type: "number" }
], -2400);

const toolCosechaGroq = createTool('actualizar_stock_cosecha_groq', urlCosecha, '{ "qty": {nuevo_stock} }', [
    { name: "cosecha_id", description: "ID de la cosecha ej. LOTE-A01", type: "string" },
    { name: "nuevo_stock", description: "Cantidad matemática resultante en gramos", type: "number" }
], -2600);

wf.nodes.push(toolInsumo, toolInsumoGroq, toolCosecha, toolCosechaGroq);

if (!wf.connections[toolInsumo.name]) wf.connections[toolInsumo.name] = { main: [[ { node: "AI Agent (Function Calling)", type: "ai_tool", index: 0 } ]] };
if (!wf.connections[toolCosecha.name]) wf.connections[toolCosecha.name] = { main: [[ { node: "AI Agent (Function Calling)", type: "ai_tool", index: 0 } ]] };

if (!wf.connections[toolInsumoGroq.name]) wf.connections[toolInsumoGroq.name] = { main: [[ { node: "AI Agent (Groq Fallback)", type: "ai_tool", index: 0 } ]] };
if (!wf.connections[toolCosechaGroq.name]) wf.connections[toolCosechaGroq.name] = { main: [[ { node: "AI Agent (Groq Fallback)", type: "ai_tool", index: 0 } ]] };

fs.writeFileSync(newFile, JSON.stringify(wf, null, 2));
console.log("Success! Generated", newFile);
