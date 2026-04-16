const fs = require('fs');

function rebuildToolPatch() {
    const nodesStr = fs.readFileSync('patched_ai_workflow_p.json', 'utf8');
    const nodes = JSON.parse(nodesStr);
    
    // 1. Fix cargar_telemetria schema
    const tele = nodes.find(n => n.name === 'cargar_telemetria');
    if(tele) {
        tele.parameters.placeholderDefinitions.values.forEach(param => {
            if(param.name === 'sala_o_lote') {
                param.description = 'OBLIGATORIO: El ID interno UUID real de la sala. PRECAUCIÓN: No uses "sala-1". Usa consultar_salas para obtener el ID correcto.';
            }
        });
    }

    // 2. Fix consultar_salas schema
    const salas = nodes.find(n => n.name === 'consultar_salas');
    if(salas) {
        if(!salas.parameters.placeholderDefinitions) {
            salas.parameters.placeholderDefinitions = { values: [] };
        }
        salas.parameters.placeholderDefinitions.values = [
            {
                "name": "filtro_opcional",
                "description": "Filtro opcional. Dejalo vacío o usa una palabra clave.",
                "type": "string"
            }
        ];
    }
    
    // 3. Fix consultar_salas_groq
    const salasGroq = nodes.find(n => n.name === 'consultar_salas_groq');
    if(salasGroq) {
        if(!salasGroq.parameters.placeholderDefinitions) {
            salasGroq.parameters.placeholderDefinitions = { values: [] };
        }
        salasGroq.parameters.placeholderDefinitions.values = [
            {
                "name": "filtro_opcional",
                "description": "Filtro opcional. Dejalo vacío o usa una palabra clave.",
                "type": "string"
            }
        ];
    }
    
    // Update the Prompt to be even more aggressive against the specific hallucinations
    const aiNode = nodes.find(n => n.name === 'AI Agent (Function Calling)');
    if (aiNode) {
        let p = aiNode.parameters.options.systemMessage;
        if (!p.includes('NO ADIVINES UUIDs')) {
            p += "\\n\\n‼️ REGLA DE ORO ‼️\\nNUNCA, NUNCA envíes textos como 'sala-1', 'sala-2', 'sala-3', ni 'sala-veg-2' al tool cargar_telemetria. Supabase rechazará esos textos porque espera un UUID real (como 2de32401-...). SIEMPRE debes usar consultar_salas para ver la lista de UUIDs disponibles y preguntarle al usuario a cuál se refiere.";
            aiNode.parameters.options.systemMessage = p;
        }
    }

    fs.writeFileSync('patched_ai_workflow3.json', JSON.stringify(nodes, null, 2));

    const connsStr = fs.readFileSync('conns_patched.json', 'utf8');
    const escNodes = JSON.stringify(nodes).replace(/'/g, "''");
    const escConns = connsStr.replace(/'/g, "''");

    const sql = `UPDATE workflow_entity \nSET nodes = '${escNodes}', \nconnections = '${escConns}' \nWHERE id = 'scpZdPe5Cp4MG98G';`;
    
    fs.writeFileSync('update_wf7.sql', sql);
    console.log("update_wf7.sql created.");
}
rebuildToolPatch();
