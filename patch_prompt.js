const fs = require('fs');

function patchPrompt() {
    const nodes = JSON.parse(fs.readFileSync('patched_ai_workflow2.json', 'utf8'));
    
    // Find the AI nodes
    const aiNode = nodes.find(n => n.name === 'AI Agent (Function Calling)' || n.type === '@n8n/n8n-nodes-langchain.agent');
    const aiNodeGroq = nodes.find(n => n.name === 'AI Agent (Groq Fallback)');

    if (!aiNode) {
        console.error("AI node not found");
        return;
    }

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

    // 3. Emphasize that Telemetry requires finding the room ID
    const searchTarget = 'Antes de ejecutar un tool de Carga (POST) que requiera un ID exacto';
    if (prompt.includes(searchTarget) && !prompt.includes('EJ: TELEMETRÍA REQUIERE SALA')) {
        prompt = prompt.replace(
            searchTarget,
            'Antes de ejecutar un tool de Carga (POST) que requiera un ID exacto (EJ: TELEMETRÍA REQUIERE BUSCAR EXACTAMENTE LA SALA CON consultar_salas)'
        );
    }

    prompt += "\n\nCRÍTICO: NO adivines ni inventes valores como 'sala-1' ni 'sala-2'. Si el usuario no menciona la sala al cargar telemetría, PIPI DEBES PREGUNTARLE.";

    aiNode.parameters.options.systemMessage = prompt;
    if (aiNodeGroq) {
        aiNodeGroq.parameters.options.systemMessage = prompt;
    }

    fs.writeFileSync('patched_ai_workflow_p.json', JSON.stringify(nodes, null, 2));
    
    // Build SQL update
    const conn = JSON.parse(fs.readFileSync('live_connections.json', 'utf8'));
    const escNodes = JSON.stringify(nodes).replace(/'/g, "''");
    const escConn = JSON.stringify(conn).replace(/'/g, "''");

    const sql = `UPDATE workflow_entity SET nodes = '${escNodes}', connections = '${escConn}' WHERE id = 'scpZdPe5Cp4MG98G';`;
    fs.writeFileSync('update_wf3.sql', sql);
    console.log('Generated update_wf3.sql with patched prompt.');
}
patchPrompt();
