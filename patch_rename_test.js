const fs = require('fs');

const nodes = JSON.parse(fs.readFileSync('server_nodes_live.json', 'utf8'));

const node = nodes.find(n => n.name === 'Format WA Response');
if (node) {
    node.name = 'SANITY_RENAME_TEST';
    node.parameters.jsCode = `
return [{ json: { response: "RENAME_SUCCESS_REALLY_THIS_TIME" } }];
`;
}

fs.writeFileSync('nodes_rename_test.json', JSON.stringify(nodes));
console.log('Rename test patch generated.');
