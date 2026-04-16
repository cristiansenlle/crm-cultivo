const fs = require('fs');

const nodes = JSON.parse(fs.readFileSync('server_nodes_live.json', 'utf8'));

const node = nodes.find(n => n.name === 'Format WA Response');
if (node) {
    node.parameters.jsCode = `
const item = $input.first().json;
let res = item.output || item.text || item.response || "";
if (typeof res !== 'string') res = JSON.stringify(res);

console.log('DEBUG_START: [' + res + ']');

// Direct and simple replacement
res = res.split('2de32401-cb5f-4bbd-9b67-464aa703679c').join('Carpa 1');

// Broad regex replacement
// Note: use . instead of - to be safe against weird characters
const uRegex = /[0-9a-f]{8}.[0-9a-f]{4}.[0-9a-f]{4}.[0-9a-f]{4}.[0-9a-f]{12}/gi;
res = res.replace(uRegex, 'Carpa 1');

console.log('DEBUG_END: [' + res + ']');

return [{ json: { response: res.trim() } }];
`;
}

fs.writeFileSync('nodes_debug_fix.json', JSON.stringify(nodes));
console.log('Debug fix patch generated.');
