const fs = require('fs');

const nodes = JSON.parse(fs.readFileSync('nodes_refined_final.json', 'utf8'));

nodes.forEach(node => {
    if (node.type === '@n8n/n8n-nodes-langchain.toolHttpRequest') {
        if (node.name.toLowerCase().includes('consultar_salas')) {
            // Rename 'name' to something the AI can't confuse, and 'id' to something it won't want to show
            node.parameters.url = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/core_rooms?select=id_interno_oculto:id,nombre_para_mostrar:name,phase";
            node.parameters.description = "Lista SALAS. Devuelve 'nombre_para_mostrar' (USA ESTO) y 'id_interno_oculto' (NUNCA MOSTRAR).";
        }
    }

    if (node.name.includes('AI Agent')) {
        if (node.parameters.options && node.parameters.options.systemMessage) {
            node.parameters.options.systemMessage = "REGLA DE VIDA O MUERTE: JAMÁS menciones IDs técnicos (ej: 2de32401...). \n" +
                "USA SIEMPRE 'nombre_para_mostrar' para referirte a salas. \n" +
                "Si el usuario pregunta por lotes, muestra solo el nombre de la sala. \n" +
                "Si no ves un nombre amigable, pide al usuario el nombre, NO muestres el ID.";
        }
    }
});

fs.writeFileSync('nodes_final_final.json', JSON.stringify(nodes));
console.log('Bulletproof patch generated.');
