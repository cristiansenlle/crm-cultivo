const fs = require('fs');

const nodes = JSON.parse(fs.readFileSync('nodes_stabilized.json', 'utf8'));

nodes.forEach(node => {
    // Aggressively trim prompts and tools
    if (node.name.includes('AI Agent')) {
        if (node.parameters.options && node.parameters.options.systemMessage) {
            node.parameters.options.systemMessage = "Experto cannábico. USA NOMBRES (Carpa 1), NO UUIDs. Ejecuta tools al confirmar. Sé muy breve.";
        }
    }

    if (node.type === '@n8n/n8n-nodes-langchain.toolHttpRequest') {
        // Super short descriptions
        if (node.name.includes('salas')) node.parameters.description = "Lista salas (id, name).";
        if (node.name.includes('lotes')) node.parameters.description = "Lista lotes y su sala (room_name).";
        if (node.name.includes('telemetria')) node.parameters.description = "Ver historial temp/hum.";
        if (node.name.includes('cargar_telemetria')) node.parameters.description = "Registra temp/hum. Usa id(UUID).";
        if (node.name.includes('evento')) node.parameters.description = "Reporta evento agrónomico.";
    }
});

fs.writeFileSync('nodes_stabilized_v3.json', JSON.stringify(nodes));
console.log('Extra-trim stabilization generated.');
