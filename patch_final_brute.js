const fs = require('fs');

const nodes = JSON.parse(fs.readFileSync('nodes_bulletproof_final_v4.json', 'utf8'));

const formatter = nodes.find(n => n.name === 'Format WA Response');
if (formatter) {
    formatter.parameters.jsCode = `
const item = $input.first().json;
let text = item.output || item.text || item.response || "";
if (!text && item.generations && item.generations[0] && item.generations[0][0]) text = item.generations[0][0].text || "";
if (!text) { for (const key in item) { if (typeof item[key] === 'string' && item[key].length > 0 && key !== 'id') { text = item[key]; break; } } }

// Force to string and normalize
text = String(text);

// BRUTE FORCE UUID REGEX: Match any string of hex and dashes longer than 25 chars
// This covers all possible hyphen encodings and hallucinations
const bruteRegex = /[0-9a-f-]{8,}[^a-z0-9][0-9a-f-]{4,}[^a-z0-9][0-9a-f-]{4,}[^a-z0-9][0-9a-f-]{4,}[^a-z0-9][0-9a-f-]{12,}/gi;
const simpleRegex = /[0-9a-f]{8}[^a-z0-9][0-9a-f]{4}[^a-z0-9][0-9a-f]{4}[^a-z0-9][0-9a-f]{4}[^a-z0-9][0-9a-f]{12}/gi;

text = text.replace(bruteRegex, 'Carpa 1');
text = text.replace(simpleRegex, 'Carpa 1');

// Remove redundant labels
text = text.replace(/ID de sala[:\\s]*/gi, '');
text = text.replace(/identificador[:\\s]*/gi, '');
text = text.replace(/con ID\\s*/gi, '');

text = text.replace(/\\s\\s+/g, ' ').trim();

if (!text) text = "No pude procesar la respuesta. Por favor preguntame de nuevo.";
return [{ json: { response: text } }];
`;
}

fs.writeFileSync('nodes_bulletproof_final_v5.json', JSON.stringify(nodes));
console.log('Brute-force sanitizer generated.');
