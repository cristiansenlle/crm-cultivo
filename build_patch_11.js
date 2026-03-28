const fs = require('fs');

function rebuildToolPatch() {
    const nodesStr = fs.readFileSync('patched_ai_workflow_p.json', 'utf8');
    const nodes = JSON.parse(nodesStr);
    
    // 1. FIX CARGAR TELEMETRIA: NUKE THE HALLUCINATION STRING!
    const tele = nodes.find(n => n.name === 'cargar_telemetria');
    if(tele) {
        tele.parameters.placeholderDefinitions.values.forEach(param => {
            if(param.name === 'sala_o_lote') {
                param.description = 'OBLIGATORIO: UUID real. PRECAUCIÓN: No uses sala-1. Usa consultar_salas para obtener el ID correcto.';
            }
        });
        tele.parameters.description = "Registra telemetría (temperatura y humedad) en una Sala o Lote específico. REQUIERE UUID real, no texto.";
    }

    // 2. FIX CONSULTAR SALAS: ADD FILTRO_OPCIONAL
    ['consultar_salas', 'consultar_salas_groq'].forEach(tn => {
        const node = nodes.find(n => n.name === tn);
        if(node) {
            if(!node.parameters.placeholderDefinitions) {
                node.parameters.placeholderDefinitions = { values: [] };
            }
            node.parameters.placeholderDefinitions.values = [
                {
                    "name": "filtro_opcional",
                    "description": "Filtro opcional. Dejalo vacío.",
                    "type": "string"
                }
            ];
            // ADD MISSING DESCRIPTION!
            node.parameters.description = "Usa esta herramienta EXCLUSIVAMENTE para listar los NOMBRES DE LAS SALAS O CARPAS (Rooms) del cultivo y obtener sus UUIDs reales. NO devuelve plantas, semillas ni lotes. Devuelve los espacios físicos de cultivo. Úsala SIEMPRE antes de cargar telemetría para encontrar el ID de la sala.";
        }
    });

    // 3. FIX CONSULTAR LOTES/INSUMOS: REMOVE FAKE PARAMETERS
    ['consultar_lotes', 'consultar_insumos'].forEach(tn => {
        const node = nodes.find(n => n.name === tn);
        if(node) {
            if(node.parameters.placeholderDefinitions) {
                node.parameters.placeholderDefinitions.values = [];
            }
        }
    });

    // 4. FIX CONSULTAR LOTES: ADD MISSING DESCRIPTION!
    const lotes = nodes.find(n => n.name === 'consultar_lotes');
    if(lotes) {
        lotes.parameters.url = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/core_batches?select=id,strain,stage,location,room_id,core_rooms(name)&order=id.asc";
        lotes.parameters.description = "Usa esta herramienta EXCLUSIVAMENTE para listar los LOTES DE PLANTAS (Batches / Genéticas). NO devuelve Salas ni Carpas físicas. Devuelve el inventario vivo de plantas (clones, esquejes, madres) y a qué sala pertenecen.";
    }

    const teleList = nodes.find(n => n.name === 'consultar_telemetria');
    if(teleList) {
        teleList.parameters.url = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/daily_telemetry?select=batch_id,room_id,temperature_c,humidity_percent,vpd_kpa,created_at,core_rooms(name)&order=created_at.desc&limit=10";
        teleList.parameters.description = "Consulta el historial de telemetría, temperatura y humedad pasadas registradas en las distintas Salas o Lotes.";
    }

    // 5. FIX AI PROMPT: BAN UUIDS FROM CHAT AND FORCE RELATIONAL RENDER
    const aiNode = nodes.find(n => n.name === 'AI Agent (Function Calling)');
    const aiGroq = nodes.find(n => n.name === 'AI Agent (Groq Fallback)');
    
    if (aiNode) {
        let p = aiNode.parameters.options.systemMessage;

        p = p.replace(/• Los tools de consultar_\* ahora tienen el parametro \{filtro_opcional\}. Ponele " " \(un espacio\) si querés todos, o la palabra clave que buscás\./g, '');
        p = p.replace(/• Cuando consultés lotes o telemetría, la API ahora te devolverá el nombre legible de la sala[\\s\\S]*?ileglibles para humanos\./g, '');
        p = p.replace(/⚠️ REGLA ESTRICTA: OCULTAR UUIDS AL USUARIO[\\s\\S]*?nombres bonitos\./g, '');
        p = p.replace(/‼️ REGLA DE ORO DE ESCRITURA ‼️[\\s\\S]*?cual se refiere\./g, '');
        
        p += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ REGLA ESTRICTA: OCULTAR UUIDS AL USUARIO
━━━━━━━━━━━━━━━━━━━━━━━━
• Cuando hables de salas, lotes, o cualquier registro con el usuario, NUNCA expongas los UUIDs (ej. 2de32401-cb5f-...). Esos códigos largos y feos son un dolor de cabeza de leer.
• SIEMPRE debes usar el nombre legible ("name" o "strain" + "fase" etc) en tu respuesta de texto. Ejemplo correcto: "Tenés la Carpa 1 operativa". Ejemplo INCORRECTO: "Tenés la sala 2de32401-...".
• Usa el UUID de la base de datos UNICAMENTE de forma invisible, pasándolo en los parámetros JSON cuando tengas que ejecutar un "cargar_telemetria" o cualquier "POST". Al humano, hablale con nombres bonitos.

━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ DIFERENCIA CRÍTICA: SALA VS LOTE
━━━━━━━━━━━━━━━━━━━━━━━━
• UNA SALA o CARPA (ROOM) es un espacio físico (Ej: Carpa 1). Para listas Salas, usá "consultar_salas".
• UN LOTE (BATCH) es un conjunto de plantas/genética (Ej: Planta Madre NP/1/2025). Para listar Lotes, usá "consultar_lotes".
• ¡NUNCA confundas uno con el otro! Si el usuario te pregunta "¿Qué salas o carpas hay?", usás consultar_salas. Si te pregunta "¿Qué lotes tengo?", usás consultar_lotes.

━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ REGLA DE LECTURA DE BASES RELACIONALES
━━━━━━━━━━━━━━━━━━━━━━━━
• Al consultar lotes o telemetría, la API te devuelve la sala anidada así: "core_rooms": { "name": "Nombre Real" }. 
• SIEMPRE extrae ese "name" y léeselo al usuario (Ej: "La temperatura en Carpa 1 es..."). ¡NUNCA leas la columna 'location' ni 'room_id' en voz alta!

‼️ REGLA DE ORO DE ESCRITURA ‼️
NUNCA, NUNCA envíes textos como 'sala-1', 'sala-2', 'Carpa 1', ni 'sala-veg-2' al tool cargar_telemetria. Supabase rechazará esos textos porque espera un UUID real (como 2de32401-...). SIEMPRE debes usar consultar_salas para ver la lista de UUIDs disponibles y la palabra exacta del usuario para saber a cuál UUID se refiere.`;

        p = p.replace(
            /• "¿Qué salas\/carpas tengo\?" → consultar_salas → detalla SUS NOMBRES REALES\n• "¿Qué lotes tengo\?"|• "¿Qué lotes tengo\?" → consultar_lotes → usa la info del tool para listarlos detalladamente|• "¿Qué salas o carpas hay organizadas\?" → consultar_salas → detalla las salas/,
            '• "¿Qué salas/carpas tengo?" → consultar_salas → detalla SUS NOMBRES REALES FISICOS\n• "¿Qué lotes/genéticas hay?" → consultar_lotes → detalla el ID textual de la planta.'
        );

        aiNode.parameters.options.systemMessage = p;
        if(aiGroq) aiGroq.parameters.options.systemMessage = p;
    }

    fs.writeFileSync('patched_ai_workflow_final.json', JSON.stringify(nodes, null, 2));

    const connsStr = fs.readFileSync('conns_patched.json', 'utf8');
    const escNodes = JSON.stringify(nodes).replace(/'/g, "''");
    const escConns = connsStr.replace(/'/g, "''");

    const sql = `UPDATE workflow_entity \nSET nodes = '${escNodes}', \nconnections = '${escConns}' \nWHERE id = 'scpZdPe5Cp4MG98G';`;
    
    fs.writeFileSync('update_wf11.sql', sql);
    console.log("FINAL SQL PATCH CREATED!");
}
rebuildToolPatch();
