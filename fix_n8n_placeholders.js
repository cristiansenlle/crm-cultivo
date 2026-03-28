
const fs = require("fs");
const path = require("path");

const wfPath = path.join(__dirname, "n8n-crm-cannabis-workflow-updated.json");
const data = JSON.parse(fs.readFileSync(wfPath, "utf-8"));

data.nodes.forEach(node => {
    if (node.type === "@n8n/n8n-nodes-langchain.toolHttpRequest" && node.name && node.name.startsWith("consultar_")) {
        // Remover filtro_opcional de placeholderDefinitions
        if (node.parameters.placeholderDefinitions && node.parameters.placeholderDefinitions.values) {
            node.parameters.placeholderDefinitions.values = node.parameters.placeholderDefinitions.values.filter(p => p.name !== "filtro_opcional");
        }
    }
    
    // Arreglar el prompt del agente
    if (node.name === "AI Agent (Function Calling)") {
       let prompt = node.parameters.options.systemMessage || "";
       
       // Remover la linea problemática del prompt
       const lineToRemove = "• Los tools de consultar_* ahora tienen el parametro {filtro_opcional}. Ponele \" \" (un espacio) si querés todos, o la palabra clave que buscás.";
       if (prompt.includes(lineToRemove)) {
           prompt = prompt.replace(lineToRemove, "");
           node.parameters.options.systemMessage = prompt;
       }
    }
});

fs.writeFileSync(path.join(__dirname, "n8n-crm-cannabis-workflow-updated-v2.json"), JSON.stringify(data, null, 2));
console.log("JSON Fixed successfully.");

