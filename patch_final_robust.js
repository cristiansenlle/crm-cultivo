const fs = require('fs');

const nodes = JSON.parse(fs.readFileSync('nodes_bulletproof_v3.json', 'utf8'));

const formatter = nodes.find(n => n.name === 'Format WA Response');
if (formatter) {
    formatter.parameters.jsCode = `
const item = $input.first().json;
let text = item.output || item.text || item.response || "";

// Langchain generations fallback
if (!text && item.generations && item.generations[0] && item.generations[0][0]) {
    text = item.generations[0][0].text || "";
}

// Any string fallback
if (!text) {
    for (const key in item) {
        if (typeof item[key] === 'string' && item[key].length > 0 && key !== 'id') {
            text = item[key];
            break;
        }
    }
}

// Sanitizer for ALL kinds of hyphens in UUIDs
// Covers -, \\u2011, \\u2212, \\u2013, \\u2014
const uuidRegex = /[0-9a-f]{8}[-\\u2011\\u2212\\u2013\\u2014][0-9a-f]{4}[-\\u2011\\u2212\\u2013\\u2014][0-9a-f]{4}[-\\u2011\\u2212\\u2013\\u2014][0-9a-f]{4}[-\\u2011\\u2212\\u2013\\u2014][0-9a-f]{12}/gi;

text = text.replace(uuidRegex, 'Carpa 1');
text = text.replace(/ID de sala[:\\s]*/gi, '');
text = text.replace(/identificador[:\\s]*/gi, '');
text = text.replace(/con ID\\s*/gi, '');

text = text.replace(/\\s\\s+/g, ' ').trim();

if (!text) text = "No pude procesar la respuesta. Por favor preguntame de nuevo.";

return [{ json: { response: text } }];
`;
}

fs.writeFileSync('nodes_bulletproof_final_v3.json', JSON.stringify(nodes));
console.log('Robust sanitizer generated.');
