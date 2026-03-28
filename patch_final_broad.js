const fs = require('fs');

const nodes = JSON.parse(fs.readFileSync('nodes_bulletproof_final_v3.json', 'utf8'));

const formatter = nodes.find(n => n.name === 'Format WA Response');
if (formatter) {
    formatter.parameters.jsCode = `
const item = $input.first().json;
let text = item.output || item.text || item.response || "";
if (!text && item.generations && item.generations[0] && item.generations[0][0]) text = item.generations[0][0].text || "";
if (!text) { for (const key in item) { if (typeof item[key] === 'string' && item[key].length > 0 && key !== 'id') { text = item[key]; break; } } }

// BROAD SANITIZER: Match 8 hex, then ANY char, then 4 hex...
// This catches standard hyphens, non-breaking ones, dashes, etc.
const broadUuidRegex = /[0-9a-f]{8}.[0-9a-f]{4}.[0-9a-f]{4}.[0-9a-f]{4}.[0-9a-f]{12}/gi;

// Replacement: Try to keep 'Carpa 1' if it looks like a room ID
text = text.replace(broadUuidRegex, 'Carpa 1');
text = text.replace(/ID de sala[:\\s]*/gi, '');
text = text.replace(/identificador[:\\s]*/gi, '');
text = text.replace(/con ID\\s*/gi, '');
text = text.replace(/\\s\\s+/g, ' ').trim();

if (!text) text = "No pude procesar la respuesta. Por favor preguntame de nuevo.";
return [{ json: { response: text } }];
`;
}

fs.writeFileSync('nodes_bulletproof_final_v4.json', JSON.stringify(nodes));
console.log('Broad sanitizer generated.');
