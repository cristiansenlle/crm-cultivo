const fs = require('fs');

function rebuildPatch() {
    const nodesStr = fs.readFileSync('patched_ai_workflow2.json', 'utf8');
    const nodes = JSON.parse(nodesStr);
    
    const aiNode = nodes.find(n => n.name === 'AI Agent (Function Calling)');
    const aiNodeGroq = nodes.find(n => n.name === 'AI Agent (Groq Fallback)');

    let prompt = aiNode.parameters.options.systemMessage;

    // 1. Fix tool name
    prompt = prompt.replace('• cargar_telemetria_sala →', '• cargar_telemetria →');

    // 2. Add consultar_salas instruction
    if (!prompt.includes('consultar_salas')) {
        prompt = prompt.replace(
            '• "¿Qué lotes tengo?"',
            '• "¿Qué salas o carpas hay organizadas?" → consultar_salas → detalla las salas\n• "¿Qué lotes tengo?"'
        );
    }

    // 3. Emphasize that Telemetry requires finding the room ID (Case Insensitive Regex)
    prompt = prompt.replace(
        /ANTES de ejecutar un tool de Carga \(POST\) que requiera un ID exacto/i,
        'ANTES de ejecutar un tool de Carga (POST) que requiera un ID exacto (EJ: TELEMETRÍA REQUIERE BUSCAR EXACTAMENTE LA SALA CON consultar_salas)'
    );

    if(!prompt.includes('CRÍTICO: NO adivines ni inventes valores')) {
        prompt += "\n\nCRÍTICO: NO adivines ni inventes valores como 'sala-1' ni 'sala-2'. Si el usuario no menciona la sala al cargar telemetría, PIPI DEBES PREGUNTARLE.";
    }

    aiNode.parameters.options.systemMessage = prompt;
    if (aiNodeGroq) {
        aiNodeGroq.parameters.options.systemMessage = prompt;
    }

    // Save patched nodes locally
    fs.writeFileSync('patched_ai_workflow_p.json', JSON.stringify(nodes, null, 2));
    
    // Read the successfully wired connections from earlier
    const connsStr = fs.readFileSync('conns_patched.json', 'utf8');
    
    const escNodes = JSON.stringify(nodes).replace(/'/g, "''");
    const escConns = connsStr.replace(/'/g, "''");

    const sql = `UPDATE workflow_entity \nSET nodes = '${escNodes}', \nconnections = '${escConns}' \nWHERE id = 'scpZdPe5Cp4MG98G';`;
    
    fs.writeFileSync('update_wf6.sql', sql);
    console.log("update_wf6.sql created. Includes?", prompt.includes('EJ: TELEMETRÍA REQUIERE BUSCAR EXACTAMENTE LA SALA'));
}
rebuildPatch();
