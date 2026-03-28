const fs = require('fs');
const file = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/active_wf_patched.json';
const wf = JSON.parse(fs.readFileSync(file, 'utf8'));

// Find an existing tool to see how it's connected
const searchTool = wf.nodes.find(n => n.name === 'consultar_lotes');
if (searchTool) {
    console.log("consultar_lotes connections:", JSON.stringify(wf.connections[searchTool.id], null, 2));
}

const addSalesTool = wf.nodes.find(n => n.name === 'cargar_ventas_pos');
if (addSalesTool) {
    console.log("cargar_ventas_pos connections:", JSON.stringify(wf.connections[addSalesTool.id], null, 2));
}
