const fs = require('fs');

const nodes = JSON.parse(fs.readFileSync('server_nodes_live.json', 'utf8'));

const node = nodes.find(n => n.name === 'Format WA Response');
if (node) {
    node.parameters.jsCode = `
return [{ json: { response: "HELLO_WORLD_TEST_SANITY" } }];
`;
}

fs.writeFileSync('nodes_pulse_test.json', JSON.stringify(nodes));
console.log('Pulse test patch generated.');
