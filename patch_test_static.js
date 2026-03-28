const fs = require('fs');

const nodes = JSON.parse(fs.readFileSync('nodes_bulletproof_vFINAL.json', 'utf8'));

const formatter = nodes.find(n => n.name === 'Format WA Response');
if (formatter) {
    formatter.parameters.jsCode = `
return [{ json: { response: "STATIC_TEST_MATCH" } }];
`;
}

fs.writeFileSync('nodes_test_static.json', JSON.stringify(nodes));
console.log('Static test patch generated.');
