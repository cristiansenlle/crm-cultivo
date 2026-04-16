const fs = require('fs');

const nodes = JSON.parse(fs.readFileSync('server_nodes_live.json', 'utf8'));

nodes.forEach(node => {
    // 1. Clean up "sala-1" examples in AI Agents
    if (node.name.includes('AI Agent')) {
        if (node.parameters.options && node.parameters.options.systemMessage) {
            node.parameters.options.systemMessage = node.parameters.options.systemMessage
                .replace(/sala-1/g, 'Sala A')
                .replace(/sala_o_lote/g, 'id_sala_u_id_lote');
        }
    }

    // 2. Fix cargar_telemetria
    if (node.name.includes('cargar_telemetria')) {
        // Use the placeholder for room_id and leave batch_id empty or as null if it's for a room
        node.parameters.parametersBody.values = [
            {
                "name": "batch_id",
                "valueProvider": "fieldValue",
                "value": "" // Clear the hardcoded UUID
            },
            {
                "name": "room_id",
                "valueProvider": "fieldValue",
                "value": "{sala_o_lote}" // Use the placeholder!
            },
            {
                "name": "temperature_c",
                "valueProvider": "fieldValue",
                "value": "{temperatura}"
            },
            {
                "name": "humidity_percent",
                "valueProvider": "fieldValue",
                "value": "{humedad}"
            }
        ];
        node.parameters.placeholderDefinitions.values.forEach(p => {
             if (p.name === 'sala_o_lote') {
                 p.description = "OBLIGATORIO: El UUID real de la sala. JAMAS uses nombres.";
             }
        });
    }

    // 3. Update tool descriptions to be even clearer
    if (node.name.includes('consultar_salas')) {
        node.parameters.description = "Lista SALAS FISICAS. Devuelve nombres amigables (ej: Carpa 1). IGNORA cualquier UUID.";
    }
});

// 4. DELETE the offending legacy node if found
const legacyNodeIndex = nodes.findIndex(n => n.name === 'PG Insert WA TM');
if (legacyNodeIndex !== -1) {
    console.log('Removing legacy node PG Insert WA TM');
    nodes.splice(legacyNodeIndex, 1);
}

fs.writeFileSync('nodes_purge.json', JSON.stringify(nodes));
console.log('Purge patch generated.');
