const fs = require('fs');

const nodes = JSON.parse(fs.readFileSync('nodes_bulletproof_final_v5.json', 'utf8'));

// 1. Force the AI to use lists instead of tables for lots
nodes.forEach(node => {
    if (node.name.includes('AI Agent')) {
        if (node.parameters.options && node.parameters.options.systemMessage) {
            node.parameters.options.systemMessage = "🚫 PROHIBICIÓN TOTAL DE UUIDs. \n" +
                "REGLA DE FORMATO: Para listar lotes, USA SIEMPRE LISTAS CON VIÑETAS (-), NUNCA TABLAS. \n" +
                "En cada viñeta indica: Nombre del lote, Cepa, Fase y Sala (USA EL NOMBRE AMIGABLE 'Carpa 1'). \n" +
                "Si ves un campo 'id_interno' o similar, IGNÓRALO COMPLETAMENTE.";
        }
    }
    // 2. Hide ID even more in tool description
    if (node.name.includes('consultar_lotes')) {
        node.parameters.description = "Lista lotes. No muestres IDs. Solo usa el nombre de sala 'Carpa 1'.";
    }
});

// 3. Keep the simple sanitizer but make it broader
const formatter = nodes.find(n => n.name === 'Format WA Response');
if (formatter) {
    formatter.parameters.jsCode = `
const item = $input.first().json;
let res = item.output || item.text || item.response || "";
if (typeof res !== 'string') res = JSON.stringify(res);

// Remove any sequence of 8 hex followed by a char and then 4 hex...
res = res.replace(/[0-9a-f]{8}[^a-z0-0]{1}[0-9a-f]{4}[^a-z0-0]{1}[0-9a-f]{4}[^a-z0-0]{1}[0-9a-f]{4}[^a-z0-0]{1}[0-9a-f]{12}/gi, 'Carpa 1');
res = res.replace(/id_interno_oculto[:\\s]*/gi, '');

return [{ json: { response: res.trim() } }];
`;
}

fs.writeFileSync('nodes_ultimatum.json', JSON.stringify(nodes));
console.log('Ultimatum patch generated.');
