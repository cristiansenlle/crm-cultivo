const fs = require("fs");
const path = require("path");

const wfPath = path.join(__dirname, "n8n-crm-cannabis-workflow-updated-v2.json");
const data = JSON.parse(fs.readFileSync(wfPath, "utf-8"));

data.nodes.forEach(node => {
    // Buscar la herramienta cargar_ventas_pos
    if (node.name === "cargar_ventas_pos" && node.type === "@n8n/n8n-nodes-langchain.toolHttpRequest") {
        if (node.parameters.placeholderDefinitions && node.parameters.placeholderDefinitions.values) {
            // Filtrar y remover el parametro "price" porque solo usamos "revenue" en el jsonBody real
            node.parameters.placeholderDefinitions.values = node.parameters.placeholderDefinitions.values.filter(p => p.name !== "price");
        }
    }
});

fs.writeFileSync(path.join(__dirname, "n8n-crm-cannabis-workflow-updated-v3.json"), JSON.stringify(data, null, 2));
console.log("JSON Fixed successfully. Version v3 created.");
