const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('C:/Users/Cristian/.gemini/antigravity/crm cannabis/active_wf_patched.json', 'utf8'));

const testTool = wf.nodes.find(n => n.name === 'consultar_ventas');
if (testTool) {
    console.log(JSON.stringify(testTool.parameters, null, 2));
}
