
const fs = require("fs");
const path = require("path");

const wfPath = path.join(__dirname, "n8n-crm-cannabis-workflow.json");
const data = JSON.parse(fs.readFileSync(wfPath, "utf-8"));

// Nombres de placeholders que NO están en ninguna URL ni body de ningún tool
// y causan el error "Misconfigured placeholder"
const BANNED_PLACEHOLDERS = ["filtro_opcional", "price"];

let fixed = 0;
data.nodes.forEach(node => {
    if (node.type === "@n8n/n8n-nodes-langchain.toolHttpRequest") {
        if (node.parameters.placeholderDefinitions && node.parameters.placeholderDefinitions.values) {
            const before = node.parameters.placeholderDefinitions.values.length;
            node.parameters.placeholderDefinitions.values = node.parameters.placeholderDefinitions.values.filter(p => !BANNED_PLACEHOLDERS.includes(p.name));
            const after = node.parameters.placeholderDefinitions.values.length;
            if (before !== after) {
                console.log("Fixed placeholders in node: " + node.name + " (" + (before - after) + " removed)");
                fixed++;
            }
        }
    }
});

fs.writeFileSync(wfPath, JSON.stringify(data, null, 2));
console.log("DONE. Fixed " + fixed + " nodes.");

