const fs = require('fs');

function rebuildToolPatch() {
    const nodesStr = fs.readFileSync('patched_ai_workflow_p.json', 'utf8');
    const nodes = JSON.parse(nodesStr);
    
    // 1. Update consultar_lotes to fetch room name natively
    const lotes = nodes.find(n => n.name === 'consultar_lotes');
    if(lotes) {
        lotes.parameters.url = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/core_batches?select=id,strain,stage,location,room_id,core_rooms(name)&order=id.asc";
    }

    // 2. Update consultar_telemetria to fetch room name natively
    const tele = nodes.find(n => n.name === 'consultar_telemetria');
    if(tele) {
        tele.parameters.url = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/daily_telemetry?select=batch_id,room_id,temperature_c,humidity_percent,vpd_kpa,created_at,core_rooms(name)&order=created_at.desc&limit=10";
    }
    
    // 3. Update the prompt to tell the agent how to read the nested 'core_rooms.name' JSON response
    const aiNode = nodes.find(n => n.name === 'AI Agent (Function Calling)');
    const aiGroq = nodes.find(n => n.name === 'AI Agent (Groq Fallback)');
    if (aiNode) {
        let p = aiNode.parameters.options.systemMessage;
        if (!p.includes('core_rooms.name')) {
            p += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ NUEVO FORMATO REGLA ESPACIAL PARA CONSULTAS
━━━━━━━━━━━━━━━━━━━━━━━━
• Cuando consultés lotes o telemetría, la API ahora te devolverá el nombre legible de la sala en un campo anidado llamado "core_rooms": { "name": "Nombre Real" }. 
• SIEMPRE decile al usuario el contenido de "name" (ej: "Carpa 1"). 
• NUNCA, NUNCA, NUNCA le leas al usuario el campo "location" o "room_id" (2de32401-...), ya que esos son UUIDs feos e ilegibles para humanos.`;
            aiNode.parameters.options.systemMessage = p;
            if(aiGroq) aiGroq.parameters.options.systemMessage = p;
        }
    }

    fs.writeFileSync('patched_ai_workflow5.json', JSON.stringify(nodes, null, 2));

    const connsStr = fs.readFileSync('conns_patched.json', 'utf8');
    const escNodes = JSON.stringify(nodes).replace(/'/g, "''");
    const escConns = connsStr.replace(/'/g, "''");

    const sql = `UPDATE workflow_entity \nSET nodes = '${escNodes}', \nconnections = '${escConns}' \nWHERE id = 'scpZdPe5Cp4MG98G';`;
    
    fs.writeFileSync('update_wf9.sql', sql);
    console.log("update_wf9.sql created. Joined core_rooms!");
}
rebuildToolPatch();
