
const fs = require("fs");
const path = require("path");

const wfPath = path.join(__dirname, "n8n-crm-cannabis-workflow.json");
const data = JSON.parse(fs.readFileSync(wfPath, "utf-8"));

data.nodes.forEach(node => {
    if (node.name === "consultar_clientes") {
        if (node.parameters.placeholderDefinitions && node.parameters.placeholderDefinitions.values) {
            node.parameters.placeholderDefinitions.values = node.parameters.placeholderDefinitions.values.filter(p => p.name !== "filtro_opcional");
        }
    }
    // Repasar tambien las otras por las dudas
    if (node.type === "@n8n/n8n-nodes-langchain.toolHttpRequest" && node.parameters.placeholderDefinitions && node.parameters.placeholderDefinitions.values) {
        node.parameters.placeholderDefinitions.values = node.parameters.placeholderDefinitions.values.filter(p => p.name !== "filtro_opcional");
    }
});

fs.writeFileSync(path.join(__dirname, "n8n-crm-cannabis-workflow.json"), JSON.stringify(data, null, 2));
console.log("consultar_clientes placeholder cleaned successfully.");

