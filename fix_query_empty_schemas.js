const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

// Add dummy 'filtro' param to tools that have 0 parameters to prevent Groq crash
wf.nodes.forEach(n => {
    if (n.type === '@n8n/n8n-nodes-langchain.toolHttpRequest') {
        const hasParams = n.parameters.placeholderDefinitions && n.parameters.placeholderDefinitions.values && n.parameters.placeholderDefinitions.values.length > 0;
        if (!hasParams) {
            if (!n.parameters.placeholderDefinitions) n.parameters.placeholderDefinitions = { values: [] };
            n.parameters.placeholderDefinitions.values.push({
                name: "filtro_opcional",
                description: "Palabra clave para filtrar resultados (ej: 'sala-1' o dejar vacio ' ' si querés todo)",
                type: "string"
            });
            // Also append the query to the URL:
            // if URL is "https://...?select=*", make it "...&location=ilike.*{filtro_opcional}*"
            n.parameters.description += " [LLM Params: {filtro_opcional}]";
            console.log(`Added dummy param to ${n.name}`);
        }
    }
});

// Update AI Prompt
wf.nodes.forEach(n => {
    if (n.type === '@n8n/n8n-nodes-langchain.agent') {
        let sm = n.parameters.options.systemMessage || '';

        if (!sm.includes('NUNCA CALL TOOLS CON PARÁMETROS NULOS')) {
            const rules = `
━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ REGLAS ANTI-CRASH (¡VIDA O MUERTE!)
━━━━━━━━━━━━━━━━━━━━━━━━
• NUNCA LLAMES AL TOOL "reportar_evento", "cargar_telemetria", etc. SI TE FALTA UN DATO OBLIGATORIO (ej. si el usuario dice "Trips sala 1" pero no tenés el batch_id/lote exacto). 
• Si te falta el lote exacto (batch_id), PREGUNTALE PRIMERO al usuario en lenguaje natural: "¿A qué lote te referís de la sala 1?". ¡No ejecutes el tool de carga hasta que el usuario te responda con el dato faltante! ¡Si ejecutas el tool incompleto el servidor explota!
• Los tools de consultar_* ahora tienen el parametro {filtro_opcional}. Ponele " " (un espacio) si querés todos, o la palabra clave que buscás.
`;
            sm = sm.replace('━━━━━━━━━━━━━━━━━━━━━━━━', rules + '\n━━━━━━━━━━━━━━━━━━━━━━━━');
        }
        n.parameters.options.systemMessage = sm;
    }
});

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Fixed Empty Schemas and Prompt crash handlers.');
