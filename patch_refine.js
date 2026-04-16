const fs = require('fs');

const nodes = JSON.parse(fs.readFileSync('nodes_stabilized_v3.json', 'utf8'));

nodes.forEach(node => {
    // 1. Rename UUID fields in URLs to look "hidden/internal"
    if (node.type === '@n8n/n8n-nodes-langchain.toolHttpRequest') {
        if (node.name.toLowerCase().includes('consultar_salas')) {
            node.parameters.url = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/core_rooms?select=id_interno:id,name,phase";
            node.parameters.description = "Lista SALAS. Devuelve id_interno (NO MOSTRAR) y name (MOSTRAR).";
        }
        if (node.name.toLowerCase().includes('consultar_lotes')) {
            // Note: PostgREST renaming is 'alias:column'
            node.parameters.url = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/core_batches?select=id,strain,stage,core_rooms(name)&order=id.asc";
            node.parameters.description = "Lista LOTES. Usa core_rooms.name para la sala. IGNORA IDs técnicos.";
        }
    }

    // 2. Extra-Strict Prompt
    if (node.name.includes('AI Agent')) {
        if (node.parameters.options && node.parameters.options.systemMessage) {
            node.parameters.options.systemMessage = "🚫 PROHIBICIÓN TOTAL: NUNCA muestres UUIDs o 'id_interno' al usuario. \n" +
                "USA SIEMPRE el campo 'name' para las salas (ej: 'Carpa 1'). \n" +
                "En tablas de lotes, la columna de ubicación debe decir el NOMBRE de la sala, no su ID. \n" +
                "Sé breve y profesional.";
        }
    }
});

fs.writeFileSync('nodes_refined_final.json', JSON.stringify(nodes));
console.log('Refined n8n patch generated.');
