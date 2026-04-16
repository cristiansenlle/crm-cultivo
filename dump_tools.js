const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('pulled_wf.json', 'utf8'));

wf.nodes.forEach(n => {
    // Si es un LLM node con tools o un nodo herramienta específica
    let str = JSON.stringify(n);
    if (str.includes('telemetria') || str.includes('sensor')) {
        console.log("---- NODE ----", n.name);
        if (n.parameters && n.parameters.schema) {
            console.log("Tool Schema:", n.parameters.schema);
        }
        if (n.parameters && n.parameters.options && n.parameters.options.systemMessage) {
            console.log("System Msg:", n.parameters.options.systemMessage);
        }
        if (n.parameters && n.parameters.text) {
             console.log("Sys:", n.parameters.text);
        }
    }
});
