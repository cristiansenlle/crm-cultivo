const fs = require('fs');

const nodes = JSON.parse(fs.readFileSync('nodes_final_final.json', 'utf8'));

// 1. Patch the Response Formatter with Sanitizer
const formatter = nodes.find(n => n.name === 'Format WA Response');
if (formatter) {
    formatter.parameters.jsCode = `
const item = $input.first().json;
let outputtext = '';

if (item.error) {
    const errStr = typeof item.error === 'string' ? item.error : (item.error.message || JSON.stringify(item.error));
    outputtext = 'Error interno del modelo de IA: ' + errStr;
} else if (item.output) {
    outputtext = item.output;
} else if (item.text) {
    outputtext = item.text;
} else if (item.response) {
    outputtext = item.response;
} else {
    try {
        if (item.generations && item.generations[0] && item.generations[0][0]) {
            outputtext = item.generations[0][0].text || '';
        }
    } catch(e) {}
}

if (!outputtext) {
    const keys = Object.keys(item).join(', ');
    outputtext = 'Sin respuesta del modelo. Datos disponibles: ' + keys;
}

// ULTIMATE SANITIZER: Remove any UUID from the text
// Match UUID and the labels usually preceding it
outputtext = outputtext.replace(/\\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\b/gi, '');
outputtext = outputtext.replace(/ID de sala[:\\s]*/gi, '');
outputtext = outputtext.replace(/identificador[:\\s]*/gi, '');
outputtext = outputtext.replace(/\\(ID oculto\\)/gi, '');
outputtext = outputtext.replace(/con ID\\s*/gi, '');

// Clean up leftovers
outputtext = outputtext.replace(/\\s\\s+/g, ' ').replace(/\\s[,.;]/g, s => s.trim()).trim();

return [{ json: { response: outputtext } }];
`;
}

// 2. Extra strict tool descriptions
nodes.forEach(node => {
    if (node.name.includes('consultar_salas')) {
        node.parameters.description = "LISTA SALAS. USA 'nombre_para_mostrar' para el usuario. NUNCA menciones el ID técnico.";
    }
});

fs.writeFileSync('nodes_bulletproof_v2.json', JSON.stringify(nodes));
console.log('Final sanitizer patch generated.');
