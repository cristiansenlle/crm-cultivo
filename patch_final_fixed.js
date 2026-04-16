const fs = require('fs');

const nodes = JSON.parse(fs.readFileSync('nodes_bulletproof_final_v5.json', 'utf8'));

const formatter = nodes.find(n => n.name === 'Format WA Response');
if (formatter) {
    formatter.parameters.jsCode = `
const item = $input.first().json;
let res = item.output || item.text || item.response || "";
if (typeof res !== 'string') res = JSON.stringify(res);

// 1. Hardcoded match for the specific Carpa 1 UUID (with any separator)
res = res.replace(/2de32401.[0-9a-f]{4}.[0-9a-f]{4}.[0-9a-f]{4}.464aa703679c/gi, 'Carpa 1');

// 2. Generic UUID match (8-4-4-4-12)
res = res.replace(/[0-9a-f]{8}.[0-9a-f]{4}.[0-9a-f]{4}.[0-9a-f]{4}.[0-9a-f]{12}/gi, 'Carpa 1');

// 3. Clean up common ID labels
res = res.replace(/ID de sala[:\\s]*/gi, '');
res = res.replace(/identificador[:\\s]*/gi, '');
res = res.replace(/con ID\\s*/gi, '');

return [{ json: { response: res.trim() } }];
`;
}

fs.writeFileSync('nodes_bulletproof_vFINAL.json', JSON.stringify(nodes));
console.log('Final refined sanitizer generated.');
