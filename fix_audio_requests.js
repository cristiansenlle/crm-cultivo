const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

wf.nodes.forEach(n => {
    // 1. RE-ADD costo_unitario to ingresar_insumo
    if (n.name === 'ingresar_insumo' || n.name === 'ingresar_insumo_groq') {
        n.parameters.description = "Registra una compra o ingreso de nuevo stock a la bodega [LLM Params: {nombre}, {tipo}, {cantidad}, {costo_unitario}]";

        const placeholders = n.parameters.placeholderDefinitions.values;
        if (!placeholders.find(v => v.name === 'costo_unitario')) {
            placeholders.push({
                "name": "costo_unitario",
                "description": "Costo por unidad",
                "type": "number"
            });
        }

        const bodyParams = n.parameters.parametersBody.values;
        if (!bodyParams.find(v => v.name === 'unit_cost')) {
            bodyParams.push({
                "name": "unit_cost",
                "value": "{costo_unitario}",
                "valueProvider": "fieldValue"
            });
        }
        console.log(`Restored costo_unitario in ${n.name}`);
    }

    // 2. Erase the Gemma node or the Mixtral node that has invalid validation
    if (n.name === 'Groq (Mixtral Fallback)' || n.name === 'OpenRouter (Gemma Fallback)' || n.type === '@n8n/n8n-nodes-langchain.lmChatOpenRouter') {
        n.type = '@n8n/n8n-nodes-langchain.lmChatGroq';
        n.typeVersion = 1;
        n.name = 'Groq (Gemma Fallback)';
        // gemma2-9b-it is typically in the default supported list of n8n Groq nodes
        n.parameters = {
            "model": "gemma2-9b-it",
            "options": {}
        };
        n.credentials = {
            "groqApi": {
                "id": "",
                "name": "Groq API"
            }
        };
        console.log('Migrated Fallback node completely to Groq with native gemma2-9b-it models to prevent UI block');
    }
});

// Repair connections if name changed for the Fallback
if (wf.connections['Groq (Mixtral Fallback)']) {
    wf.connections['Groq (Gemma Fallback)'] = wf.connections['Groq (Mixtral Fallback)'];
    delete wf.connections['Groq (Mixtral Fallback)'];
}
if (wf.connections['OpenRouter (Gemma Fallback)']) {
    wf.connections['Groq (Gemma Fallback)'] = wf.connections['OpenRouter (Gemma Fallback)'];
    delete wf.connections['OpenRouter (Gemma Fallback)'];
}

for (const [nodeName, nodeConns] of Object.entries(wf.connections)) {
    for (const [outputName, outputs] of Object.entries(nodeConns)) {
        outputs.forEach(outputsArray => {
            outputsArray.forEach(conn => {
                if (conn.node === 'Groq (Mixtral Fallback)' || conn.node === 'OpenRouter (Gemma Fallback)') {
                    conn.node = 'Groq (Gemma Fallback)';
                }
            });
        });
    }
}

// Update the system string on the Agent to require costo_unitario again
const agent = wf.nodes.find(n => n.name === 'AI Agent' || n.type === '@n8n/n8n-nodes-langchain.agent');
if (agent && agent.parameters.options && agent.parameters.options.systemMessage) {
    let sm = agent.parameters.options.systemMessage;
    // Replace the previous string if it lacks costo unitario
    sm = sm.replace(/ingresar_insumo_bodega → Nombre del insumo, Tipo \(fertilizante\/pesticida\/sustrato\), Cantidad(?!, Costo)/g, 'ingresar_insumo_bodega → Nombre del insumo, Tipo (fertilizante/pesticida/sustrato), Cantidad, Costo unitario');
    agent.parameters.options.systemMessage = sm;
}

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Saved repair.');
