const fs = require('fs');

function patch() {
    const nodes = JSON.parse(fs.readFileSync('patched_ai_workflow.json', 'utf8'));
    const conn = JSON.parse(fs.readFileSync('live_connections.json', 'utf8'));

    // The AI Agent nodes might be named "AI Agent (Function Calling)" and "AI Agent (Groq Fallback)"
    const aiAgents = nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.agent').map(n => n.name);

    // Build the ai_tool array connections
    const aiToolConns = aiAgents.map(name => ({
        node: name,
        type: 'ai_tool',
        index: 0
    }));

    conn['consultar_salas'] = {
        'ai_tool': [ aiToolConns ]
    };

    if (nodes.find(n => n.name === 'consultar_salas_groq')) {
        conn['consultar_salas_groq'] = {
            'ai_tool': [ aiToolConns ]
        };
    }

    const escNodes = JSON.stringify(nodes).replace(/'/g, "''");
    const escConn = JSON.stringify(conn).replace(/'/g, "''");

    const sql = `UPDATE workflow_entity SET nodes = '${escNodes}', connections = '${escConn}' WHERE id = 'scpZdPe5Cp4MG98G';`;
    fs.writeFileSync('update_wf.sql', sql);
    console.log('SQL update file generated: update_wf.sql');
}
patch();
