const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

// 1. Create the new crear_lote tool node based on the reportar_evento structure
const baseTool = wf.nodes.find(n => n.name === 'reportar_evento');

let crearLoteTool = JSON.parse(JSON.stringify(baseTool));
crearLoteTool.id = "new_tool_crear_lote_" + Date.now();
crearLoteTool.name = 'crear_lote';
crearLoteTool.position = [baseTool.position[0], baseTool.position[1] + 150];
crearLoteTool.parameters.url = 'https://dvvfdsaqvcyftaaronhd.supabase.co/rest/v1/core_batches';
crearLoteTool.parameters.description = "Crea un nuevo lote/batch de cultivo desde cero [LLM Params: {batch_id}, {cepa}, {fase_inicial}, {sala}]";
crearLoteTool.parameters.placeholderDefinitions.values = [
    { name: "batch_id", description: "ID del nuevo lote (Ej: LOTE-2-2026)", type: "string" },
    { name: "cepa", description: "Nombre de la genética o cepa (Ej: Nicole Punch)", type: "string" },
    { name: "fase_inicial", description: "Fase inicial (clon/vegetativo/floracion)", type: "string" },
    { name: "sala", description: "Sala de ubicación inicial (Ej: sala-veg-2)", type: "string" }
];
crearLoteTool.parameters.parametersBody.values = [
    { name: "id", value: "{batch_id}", valueProvider: "fieldValue" },
    { name: "strain", value: "{cepa}", valueProvider: "fieldValue" },
    { name: "stage", value: "{fase_inicial}", valueProvider: "fieldValue" },
    { name: "location", value: "{sala}", valueProvider: "fieldValue" }
];

let crearLoteToolGroq = JSON.parse(JSON.stringify(crearLoteTool));
crearLoteToolGroq.id = "new_tool_crear_lote_groq_" + Date.now();
crearLoteToolGroq.name = 'crear_lote_groq';
crearLoteToolGroq.position = [baseTool.position[0], baseTool.position[1] + 300];

// Push both tool branches
wf.nodes.push(crearLoteTool);
wf.nodes.push(crearLoteToolGroq);

// Wire them up to the agents
function wireToolToAgent(toolName, agentName) {
    if (!wf.connections[toolName]) wf.connections[toolName] = { "ai_tool": [] };
    wf.connections[toolName]["ai_tool"].push([{ "node": agentName, "type": "ai_tool", "index": 0 }]);
}
wireToolToAgent('crear_lote', 'AI Agent');
wireToolToAgent('crear_lote_groq', 'AI Agent (IF False)');

// 2. Fix the AI Prompts
wf.nodes.forEach(n => {
    if (n.type === '@n8n/n8n-nodes-langchain.agent') {
        let sm = n.parameters.options.systemMessage || '';

        // Fix reportar_evento name mismatch
        sm = sm.replace(/reportar_evento_agronomico/g, 'reportar_evento');

        // Add crear_lote to the instructions
        if (!sm.includes('crear_lote →')) {
            sm = sm.replace('DATOS REQUERIDOS POR TOOL:', 'DATOS REQUERIDOS POR TOOL:\n• crear_lote → Lote (batch_id), Cepa/Genética, Fase Inicial (clon/vegetativo), Sala de ubicación');
        }

        // Add anti-hallucination instruction
        const antiHallucination = `
━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ REGLAS DE EJECUCIÓN DE HERRAMIENTAS (¡CRÍTICO!)
━━━━━━━━━━━━━━━━━━━━━━━━
• Cuando el usuario confirme que los datos son correctos (Ej: dice "Sí"), DEBES EJECUTAR LA HERRAMIENTA NATIVAMENTE (Tool Call).
• NUNCA, BAJO NINGUNA CIRCUNSTANCIA, debes responder con un JSON crudo simulando la herramienta (Ej: nunca digas 'cargar_telemetria {"temperatura": 25}'). Eso es un error grave. Llama a la herramienta real en segundo plano y responde al usuario con lenguaje natural: "Guardado exitosamente".
`;
        if (!sm.includes('REGLAS DE EJECUCIÓN')) {
            sm += antiHallucination;
        }

        n.parameters.options.systemMessage = sm;
    }
});

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Saved repair. Created new tools: crear_lote, crear_lote_groq.');
