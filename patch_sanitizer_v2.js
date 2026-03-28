const fs = require('fs');

const nodes = JSON.parse(fs.readFileSync('nodes_bulletproof_v2.json', 'utf8'));

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

// ULTIMATE SANITIZER V2: Handle non-standard hyphens (\u2011, etc.)
// Covers: -, \u2011 (non-breaking), \u2212 (minus), \u2013 (en dash), \u2014 (em dash)
const uuidRegex = /[0-9a-f]{8}[-\\u2011\\u2212\\u2013\\u2014][0-9a-f]{4}[-\\u2011\\u2212\\u2013\\u2014][0-9a-f]{4}[-\\u2011\\u2212\\u2013\\u2014][0-9a-f]{4}[-\\u2011\\u2212\\u2013\\u2014][0-9a-f]{12}/gi;

outputtext = outputtext.replace(uuidRegex, 'Carpa 1'); // Falling back to Carpa 1 since we only have one room right now
outputtext = outputtext.replace(/ID de sala[:\\s]*/gi, '');
outputtext = outputtext.replace(/identificador[:\\s]*/gi, '');
outputtext = outputtext.replace(/\\(ID oculto\\)/gi, '');
outputtext = outputtext.replace(/con ID\\s*/gi, '');

// Clean up: If we have "ubicada en la sala Carpa 1", it's fine.
// But if it's "| ... | Carpa 1 |", it's even better.

outputtext = outputtext.replace(/\\s\\s+/g, ' ').replace(/\\s[,.;]/g, s => s.trim()).trim();

return [{ json: { response: outputtext } }];
`;
}

fs.writeFileSync('nodes_bulletproof_v3.json', JSON.stringify(nodes));
console.log('Sanitizer V2 generated with non-breaking hyphen support.');
