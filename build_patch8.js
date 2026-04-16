const fs = require('fs');

function rebuildToolPatch() {
    const nodesStr = fs.readFileSync('patched_ai_workflow_p.json', 'utf8');
    const nodes = JSON.parse(nodesStr);
    
    // Clean up any fake parameters from 'consultar_salas' and 'consultar_salas_groq'
    ['consultar_salas', 'consultar_salas_groq', 'consultar_lotes', 'consultar_insumos'].forEach(tn => {
        const node = nodes.find(n => n.name === tn);
        if(node && node.parameters.placeholderDefinitions) {
            node.parameters.placeholderDefinitions.values = [];
        }
    });

    const aiNode = nodes.find(n => n.name === 'AI Agent (Function Calling)');
    const aiGroq = nodes.find(n => n.name === 'AI Agent (Groq Fallback)');
    
    if (aiNode) {
        let p = aiNode.parameters.options.systemMessage;

        // Strip out the harmful instruction about filtro_opcional
        p = p.replace(/• Los tools de consultar_\* ahora tienen el parametro \{filtro_opcional\}. Ponele " " \(un espacio\) si querés todos, o la palabra clave que buscás\./g, '');
        
        // Add explicit instructions about UUID hiding!
        if (!p.includes('OCULTAR UUIDS AL USUARIO')) {
            p += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ REGLA ESTRICTA: OCULTAR UUIDS AL USUARIO
━━━━━━━━━━━━━━━━━━━━━━━━
• Cuando hables de salas, lotes, o cualquier registro con el usuario, NUNCA expongas los UUIDs (ej. 2de32401-cb5f-...). Esos códigos largos y feos son un dolor de cabeza de leer.
• SIEMPRE debes usar el nombre legible ("name" o "strain" + "fase" etc) en tu respuesta de texto. Ejemplo correcto: "Tenés la Carpa 1 operativa". Ejemplo INCORRECTO: "Tenés la sala 2de32401-...".
• Usa el UUID de la base de datos UNICAMENTE de forma invisible, pasándolo en los parámetros JSON cuando tengas que ejecutar un "cargar_telemetria" o cualquier "POST". Al humano, hablale con nombres bonitos.`;
        }
        
        // Emphasize using consultar_salas over consultar_telemetria for list
        p = p.replace(
            /(• "¿Qué salas o carpas hay organizadas\?" → consultar_salas → detalla las salas\n)?• "¿Qué lotes tengo\?"/,
            '• "¿Qué salas/carpas tengo?" → consultar_salas → detalla SUS NOMBRES REALES\n• "¿Qué lotes tengo?"'
        );

        aiNode.parameters.options.systemMessage = p;
        if(aiGroq) aiGroq.parameters.options.systemMessage = p;
    }

    fs.writeFileSync('patched_ai_workflow4.json', JSON.stringify(nodes, null, 2));

    const connsStr = fs.readFileSync('conns_patched.json', 'utf8');
    const escNodes = JSON.stringify(nodes).replace(/'/g, "''");
    const escConns = connsStr.replace(/'/g, "''");

    const sql = `UPDATE workflow_entity \nSET nodes = '${escNodes}', \nconnections = '${escConns}' \nWHERE id = 'scpZdPe5Cp4MG98G';`;
    
    fs.writeFileSync('update_wf8.sql', sql);
    console.log("update_wf8.sql created. Length of prompt:", aiNode.parameters.options.systemMessage.length);
}
rebuildToolPatch();
