const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

// Delete the exact strings from the system message
wf.nodes.forEach(n => {
    if (n.type === '@n8n/n8n-nodes-langchain.agent') {
        let sm = n.parameters.options.systemMessage || '';
        sm = sm.replace(/listá: \"Tus lotes activos son: LOTE-A01 \(Sour Diesel, vegetativo, sala-veg-1\), \.\.\.\"/g, 'usa la info del tool para listarlos detalladamente');
        sm = sm.replace(/listá nombre, tipo, stock y si está bajo mínimo/g, 'usa la info del tool para listarlos detalladamente');
        sm = sm.replace(/listá gramos y precio/g, 'usa la info del tool para listarlos detalladamente');

        // Add an explicit instruction to NOT memorize examples
        if (!sm.includes('NO REPITAS LOS EJEMPLOS')) {
            sm = sm.replace('📋 MODO CONSULTA\n━━━━━━━━━━━━━━━━━━━━━━━━━', '📋 MODO CONSULTA\n━━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ IMPORTANTE: ¡DEBES EJECUTAR LAS HERRAMIENTAS REALES PARA OBTENER LOS DATOS! NUNCA INVENTES DATOS NI REPITAS LOS TEXTOS DE EJEMPLO DE ESTE PROMPT.\n');
        }
        n.parameters.options.systemMessage = sm;
    }
});

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Fixed Agent Prompt to stop parroting examples.');
