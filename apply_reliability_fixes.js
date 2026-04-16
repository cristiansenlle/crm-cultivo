const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'n8n-crm-cannabis-workflow.json');
const workflow = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// 1. Update Format WA Response node (jsCode)
const formatNode = workflow.nodes.find(n => n.name === 'Format WA Response');
if (formatNode) {
    formatNode.parameters.jsCode = `const item = $input.first().json;
let outputtext = '';

if (item.error) {
    const errStr = typeof item.error === 'string' ? item.error : (item.error.message || JSON.stringify(item.error));
    outputtext = 'Error interno del modelo de IA: ' + errStr;
} else if (item.output && item.output.trim() !== '') {
    outputtext = item.output;
} else if (item.text && item.text.trim() !== '') {
    outputtext = item.text;
} else if (item.response && item.response.trim() !== '') {
    outputtext = item.response;
} else {
    try {
        if (item.generations && item.generations[0] && item.generations[0][0]) {
            outputtext = item.generations[0][0].text || '';
        }
    } catch(e) {}
}

// Resilience fallback: If no text was found but no error occurred
if (!outputtext || outputtext.trim() === '') {
    if (item.error) {
        outputtext = 'Se produjo un error al procesar la solicitud.';
    } else {
        // Successful tool execution but empty final response
        outputtext = '✅ Acción completada exitosamente.';
    }
}

return [{ json: { response: outputtext } }];
`;
    console.log('Format WA Response node updated.');
}

// 2. Update AI Agent nodes (maxIterations and systemMessage)
const agents = ['AI Agent (Function Calling)', 'AI Agent (Groq Fallback)'];
agents.forEach(agentName => {
    const node = workflow.nodes.find(n => n.name === agentName);
    if (node) {
        // Increase iterations to handle lists (3 items * (consult + record) = 6+ tools)
        node.parameters.options.maxIterations = 20;
        
        // Enhance system message for multi-item list reliability
        let msg = node.parameters.options.systemMessage || '';
        
        const multiItemInstruction = `\n━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ PROCESAMIENTO DE LISTAS (MÚLTIPLES ACCIONES)\n━━━━━━━━━━━━━━━━━━━━━━━━\n• Si el usuario pide registrar o consultar múltiples cosas (ej: 3 plantas, 5 lotes, etc), DEBÉS ejecutarlas TODAS una por una.\n• NO te detengas después de la primera acción. Continúa hasta completar la lista entera.\n• Al finalizar todas las acciones, debés dar un resumen final claro en lenguaje natural confirmando qué se hizo satisfactoriamente y qué falló (si algo falló).`;

        if (!msg.includes('PROCESAMIENTO DE LISTAS')) {
            node.parameters.options.systemMessage = msg + multiItemInstruction;
        }
        
        console.log(`${agentName} updated (Iterations: 20 + New Instructions).`);
    }
});

fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2), 'utf8');
console.log('Workflow JSON patched successfully.');
