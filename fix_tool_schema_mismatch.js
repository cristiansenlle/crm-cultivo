const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

wf.nodes.forEach(n => {
    // Fix tool: ingresar_insumo
    if (n.name === 'ingresar_insumo' || n.name === 'ingresar_insumo_groq') {
        n.parameters.description = "Registra una compra o ingreso de nuevo stock a la bodega [LLM Params: {nombre}, {tipo}, {cantidad}]";

        if (n.parameters.placeholderDefinitions && n.parameters.placeholderDefinitions.values) {
            n.parameters.placeholderDefinitions.values = n.parameters.placeholderDefinitions.values.filter(v => v.name !== 'costo_unitario');
        }

        if (n.parameters.parametersBody && n.parameters.parametersBody.values) {
            n.parameters.parametersBody.values = n.parameters.parametersBody.values.filter(v => v.name !== 'unit_cost');
        }
        console.log(`Fixed schema mismatch on ${n.name} (removed costo_unitario)`);
    }

    // Fix tool: cargar_telemetria
    if (n.name === 'cargar_telemetria' || n.name === 'cargar_telemetria_groq') {
        n.parameters.description = "Registra la temperatura y humedad actual de una sala o lote específico [LLM Params: {sala_o_lote}, {temperatura}, {humedad}]";

        if (n.parameters.placeholderDefinitions && n.parameters.placeholderDefinitions.values) {
            let salaParam = n.parameters.placeholderDefinitions.values.find(v => v.name === 'sala');
            if (salaParam) {
                salaParam.name = 'sala_o_lote';
                salaParam.description = "ID del lote o de la sala (ej: sala-1 o LOTE-A01)";
            }
        }

        if (n.parameters.parametersBody && n.parameters.parametersBody.values) {
            let roomParam = n.parameters.parametersBody.values.find(v => v.name === 'room_id');
            if (roomParam) {
                roomParam.name = 'batch_id'; // the DB requires batch_id, it currently stores the room ID there
                roomParam.value = '{sala_o_lote}';
            }
        }
        console.log(`Fixed schema mismatch on ${n.name} (mapped sala to batch_id)`);
    }
});

// Update the system string on the Agent to remove costo_unitario requirement
const agent = wf.nodes.find(n => n.name === 'AI Agent' || n.type === '@n8n/n8n-nodes-langchain.agent');
if (agent && agent.parameters.options && agent.parameters.options.systemMessage) {
    let sm = agent.parameters.options.systemMessage;
    sm = sm.replace(/ingresar_insumo_bodega → Nombre del insumo, Tipo.*\, Cantidad, Costo unitario/g, 'ingresar_insumo_bodega → Nombre del insumo, Tipo (fertilizante/pesticida/sustrato), Cantidad');
    agent.parameters.options.systemMessage = sm;
}

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Saved repair.');
