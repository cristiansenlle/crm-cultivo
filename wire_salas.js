const fs = require('fs');

function wireSalas() {
    const rawConns = fs.readFileSync('conns_verify.json', 'utf8').trim();
    if(rawConns.length === 0) {
        console.log("Empty conns");
        return;
    }
    const conns = JSON.parse(rawConns);

    // Target link from the other tools:
    const targetLink = {
        "node": "AI Agent (Function Calling)",
        "type": "ai_tool",
        "index": 0
    };
    const targetLinkGroq = {
        "node": "AI Agent (Groq Fallback)",
        "type": "ai_tool",
        "index": 0
    };

    conns['consultar_salas'] = {
        "ai_tool": [
             [targetLink, targetLinkGroq]
        ]
    };

    conns['consultar_salas_groq'] = {
        "ai_tool": [
             [targetLink, targetLinkGroq]
        ]
    };

    fs.writeFileSync('conns_patched.json', JSON.stringify(conns));
    
    // Create new SQL update wrapper
    const escConn = JSON.stringify(conns).replace(/'/g, "''");
    const sql = `UPDATE workflow_entity SET connections = '${escConn}' WHERE id = 'scpZdPe5Cp4MG98G';`;
    fs.writeFileSync('update_wf4.sql', sql);
    console.log("Wired consultar_salas tools to AI Agent.");
}
wireSalas();
