const fs = require('fs');
try {
    const rawNodes = fs.readFileSync('nodes_verify.json', 'utf8').trim();
    if(rawNodes.length === 0) {
        console.log("nodes_verify.json is empty.");
        process.exit();
    }
    const nodes = JSON.parse(rawNodes);

    const aiNode = nodes.find(n => n.name === 'AI Agent (Function Calling)');
    if (aiNode) {
        console.log("Found AI Node. Prompt preview:");
        const p = aiNode.parameters.options.systemMessage || "";
        console.log(p.substring(0, 150) + '...');
        console.log("Has consultar_salas in prompt?", p.includes('consultar_salas'));
        console.log("Has EJ: TELEMETRÍA REQUIERE BUSCAR EXACTAMENTE?", p.includes('EJ: TELEMETRÍA REQUIERE BUSCAR EXACTAMENTE LA SALA'));
    } else {
        console.log("AI Agent not found");
    }
    
    const teleTool = nodes.find(n => n.name === 'cargar_telemetria');
    if (teleTool) {
         console.log("cargar_telemetria payload names:", teleTool.parameters.parametersBody.values.map(v => v.name));
    } else {
         console.log("cargar_telemetria not found");
    }

    const salaTool = nodes.find(n => n.name === 'consultar_salas');
    if (salaTool) {
         console.log("consultar_salas tool exists.");
    } else {
         console.log("consultar_salas tool MISSING!");
    }
} catch(e) {
    console.error(e);
}
