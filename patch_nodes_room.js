const fs = require('fs');

const data = JSON.parse(fs.readFileSync('wf_inspect.json', 'utf8'))[0];
const nodes = JSON.parse(Buffer.from(data.nodes.data).toString());

nodes.forEach(node => {
    // 1. Patch Read Tools (Flatten and Alias Room Name)
    if (node.name.startsWith('consultar_salas')) {
        node.parameters.url = node.parameters.url.replace('id,name,phase', 'id,room_uuid:id,name,room_name:name,phase');
        node.parameters.description = "Lista SALAS FISICAS. Devuelve: room_name (USAR ESTE), name, phase. NUNCA menciones el UUID al usuario.";
    }
    
    if (node.name.startsWith('consultar_lotes')) {
        node.parameters.url = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/core_batches?select=id,strain,stage,room_name:core_rooms(name)&order=id.asc";
        node.parameters.description = "Lista LOTES DE PLANTAS. Cada lote tiene: id, strain, stage, y room_name (nombre legible de la sala). USA room_name para referirte a la sala.";
    }

    if (node.name.startsWith('consultar_telemetria')) {
        node.parameters.url = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/daily_telemetry?select=temperature_c,humidity_percent,created_at,room_name:core_rooms(name)&order=created_at.desc&limit=10";
    }

    if (node.name.startsWith('consultar_eventos')) {
         node.parameters.url = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/core_agronomic_events?select=batch_id,event_type,description,date_occurred,room_name:core_rooms(name)&order=date_occurred.desc&limit=20";
    }

    // 2. Patch Write Tools (Return Representation with Name)
    if (node.name.startsWith('cargar_telemetria') || node.name.startsWith('reportar_evento')) {
        if (!node.parameters.url.includes('select=')) {
            node.parameters.url += node.parameters.url.includes('?') ? '&select=*,room_name:core_rooms(name)' : '?select=*,room_name:core_rooms(name)';
        }
    }

    // 3. Patch AI Agent Prompt
    if (node.name.includes('AI Agent')) {
        let prompt = node.parameters.options.systemMessage || "";
        prompt = "🚀 REGLA SUPREMA: NUNCA muestres UUIDs (ej: 2de32401...) al usuario. \n" +
                 "Si necesitas nombrar una sala, usa el campo 'room_name' o 'name' devuelto por las herramientas. \n" +
                 "Si una herramienta devuelve un ID y un Nombre, elige SIEMPRE el NOMBRE para hablarle al humano. \n\n" + prompt;
        node.parameters.options.systemMessage = prompt;
    }
});

fs.writeFileSync('nodes_room_patched.json', JSON.stringify(nodes, null, 2));
console.log('Patch JSON generated.');
