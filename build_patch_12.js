const fs = require('fs');

function rebuildToolPatch() {
    const nodesStr = fs.readFileSync('patched_ai_workflow_final.json', 'utf8');
    const nodes = JSON.parse(nodesStr);
    
    // 1. FIX CARGAR TELEMETRIA: BRUTALLY ANNIHILATE THE HALLUCINATION STRING!
    const tele = nodes.find(n => n.name === 'cargar_telemetria');
    if(tele) {
        if (tele.parameters.placeholderDefinitions && tele.parameters.placeholderDefinitions.values) {
           tele.parameters.placeholderDefinitions.values.forEach(param => {
               if(param.name === 'sala_o_lote' || param.name === 'room_id' || param.name === 'batch_id') {
                   param.description = 'OBLIGATORIO: UUID real de 36 caracteres. REGLA DE ORO: JAMÁS USES NOMBRES COMO "sala-1", "Carpa 1", NI "LOTE-EX-1". Usa SÓLO el UUID obtenido de consultar_salas.';
               }
           });
        }
        tele.parameters.description = "Registra telemetría (temperatura y humedad) en una Sala o Lote. REQUIERE UUID real (ej: 2de32401-cb5f-4bbd-9b67-464aa703679c), NUNCA texto.";
    }

    // 2. FIX CONSULTAR SALAS: UPDATE WITH CLEAR MISSION
    ['consultar_salas', 'consultar_salas_groq'].forEach(tn => {
        const node = nodes.find(n => n.name === tn);
        if(node) {
            node.parameters.description = "Listar NOMBRES FÍSICOS DE LAS SALAS O CARPAS (Rooms) del cultivo y obtener sus UUIDs reales. Úsala SIEMPRE antes de cargar telemetría para encontrar el ID UUID de la sala.";
        }
    });

    // 3. FIX CONSULTAR LOTES: REMOVE RAW UUID COLUMNS FROM VISIBILITY
    const lotes = nodes.find(n => n.name === 'consultar_lotes');
    if(lotes) {
        // I am removing 'location' and 'room_id' from the SELECT!
        // The AI will ONLY see core_rooms(name)
        lotes.parameters.url = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/core_batches?select=id,strain,stage,core_rooms(name)&order=id.asc";
        lotes.parameters.description = "Usa esta herramienta EXCLUSIVAMENTE para listar LOS LOTES DE PLANTAS (Batches / Genéticas). NO devuelve Salas ni Carpas físicas. Devuelve el inventario vivo de plantas (clones, esquejes, madres) y a qué sala pertenecen.";
    }

    // 4. FIX CONSULTAR TELEMETRIA: REMOVE RAW UUID COLUMNS
    const teleList = nodes.find(n => n.name === 'consultar_telemetria');
    if(teleList) {
        teleList.parameters.url = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/daily_telemetry?select=temperature_c,humidity_percent,vpd_kpa,created_at,core_rooms(name)&order=created_at.desc&limit=10";
        teleList.parameters.description = "Consulta la historial de telemetría (temperatura y humedad) registradas en Salas o Lotes.";
    }

    // 5. UPDATE SYSTEM PROMPT FOR GOOD MEASURE
    const aiNode = nodes.find(n => n.name === 'AI Agent (Function Calling)');
    const aiGroq = nodes.find(n => n.name === 'AI Agent (Groq Fallback)');
    
    if (aiNode) {
        let p = aiNode.parameters.options.systemMessage;

        p += `\n\n📌 ATENCIÓN: Si el usuario dice "Cargar temperatura 25 humedad 45" y no menciona en DÓNDE, responde ESTRICTAMENTE: 
"Para registrar la telemetría, necesito saber a qué Sala o Carpa física corresponde. ¿Dime en qué sala (ej. Carpa 1)?"
¡NO LE LISTES LOS LOTES! ¡NUNCA LE DIGAS LOS IDs DE LOS LOTES!`;

        aiNode.parameters.options.systemMessage = p;
        if(aiGroq) aiGroq.parameters.options.systemMessage = p;
    }

    fs.writeFileSync('patched_ai_workflow_final_v2.json', JSON.stringify(nodes, null, 2));

    const connsStr = fs.readFileSync('conns_patched.json', 'utf8');
    const escNodes = JSON.stringify(nodes).replace(/'/g, "''");
    const escConns = connsStr.replace(/'/g, "''");

    const sql = `UPDATE workflow_entity \nSET nodes = '${escNodes}', \nconnections = '${escConns}' \nWHERE id = 'scpZdPe5Cp4MG98G';`;
    
    fs.writeFileSync('update_wf12.sql', sql);
    console.log("FINAL SQL PATCH V2 CREATED!");
}

rebuildToolPatch();
