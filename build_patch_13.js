const fs = require('fs');

function rebuildToolPatch() {
    const nodesStr = fs.readFileSync('patched_ai_workflow_final_v2.json', 'utf8');
    const nodes = JSON.parse(nodesStr);
    
    // 1. FIX CARGAR TELEMETRIA (MAIN & GROQ)
    ['cargar_telemetria', 'cargar_telemetria_groq'].forEach(tn => {
        const tele = nodes.find(n => n.name === tn);
        if(tele) {
            if (tele.parameters.placeholderDefinitions && tele.parameters.placeholderDefinitions.values) {
               tele.parameters.placeholderDefinitions.values.forEach(param => {
                   if(param.name === 'sala_o_lote' || param.name === 'room_id' || param.name === 'batch_id') {
                       param.description = 'OBLIGATORIO: UUID real de 36 caracteres. REGLA DE ORO: JAMÁS USES NOMBRES COMO "sala-1", "Carpa 1", NI "LOTE-EX-1". Usa SÓLO el UUID obtenido de consultar_salas.';
                   }
               });
            }
            tele.parameters.description = "Registra telemetría (temperatura y humedad) en una Sala o Lote. REQUIERE UUID real (ej: 2de32401-cb5f-4bbd-9b67-464aa703679c), NUNCA texto.";
            // Also override the body parameter to make sure it doesn't accidentally receive fake text
            if(tele.parameters.parametersBody && tele.parameters.parametersBody.values) {
                 tele.parameters.parametersBody.values.forEach(param => {
                     if (param.name === 'batch_id' && param.value === 'sala-1') {
                         param.value = "{sala_o_lote}";
                     }
                 });
            }
        }
    });

    // 2. FIX CONSULTAR SALAS (MAIN & GROQ)
    ['consultar_salas', 'consultar_salas_groq'].forEach(tn => {
        const node = nodes.find(n => n.name === tn);
        if(node) {
            node.parameters.description = "Listar NOMBRES FÍSICOS DE LAS SALAS O CARPAS (Rooms) del cultivo y obtener sus UUIDs reales. Úsala SIEMPRE antes de cargar telemetría para encontrar el ID UUID de la sala.";
        }
    });

    // 3. FIX CONSULTAR LOTES (MAIN & GROQ)
    ['consultar_lotes', 'consultar_lotes_groq'].forEach(tn => {
        const lotes = nodes.find(n => n.name === tn);
        if(lotes) {
            lotes.parameters.url = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/core_batches?select=id,strain,stage,core_rooms(name)&order=id.asc";
            lotes.parameters.description = "Usa esta herramienta EXCLUSIVAMENTE para listar LOS LOTES DE PLANTAS (Batches / Genéticas). NO devuelve Salas ni Carpas físicas. Devuelve el inventario vivo de plantas (clones, esquejes, madres) y a qué sala pertenecen.";
        }
    });

    // 4. FIX CONSULTAR TELEMETRIA (MAIN & GROQ)
    ['consultar_telemetria', 'consultar_telemetria_groq'].forEach(tn => {
        const teleList = nodes.find(n => n.name === tn);
        if(teleList) {
            teleList.parameters.url = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/daily_telemetry?select=temperature_c,humidity_percent,vpd_kpa,created_at,core_rooms(name)&order=created_at.desc&limit=10";
            teleList.parameters.description = "Consulta el historial de telemetría (temperatura y humedad) registradas en Salas o Lotes.";
        }
    });
    
    // 5. FIX CONSULTAR EVENTOS (MAIN & GROQ)
    ['consultar_eventos_agronomicos', 'consultar_eventos_agronomicos_groq'].forEach(tn => {
        const eventList = nodes.find(n => n.name === tn);
        if(eventList) {
            eventList.parameters.url = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/core_agronomic_events?select=batch_id,event_type,description,date_occurred,core_rooms(name)&order=date_occurred.desc&limit=20";
        }
    });

    fs.writeFileSync('patched_ai_workflow_final_v13.json', JSON.stringify(nodes, null, 2));

    const connsStr = fs.readFileSync('conns_patched.json', 'utf8');
    const escNodes = JSON.stringify(nodes).replace(/'/g, "''");
    const escConns = connsStr.replace(/'/g, "''");

    const sql = `UPDATE workflow_entity \nSET nodes = '${escNodes}', \nconnections = '${escConns}' \nWHERE id = 'scpZdPe5Cp4MG98G';`;
    
    fs.writeFileSync('update_wf13.sql', sql);
    console.log("FINAL SQL PATCH V13 CREATED!");
}

rebuildToolPatch();
