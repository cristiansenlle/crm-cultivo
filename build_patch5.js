const fs = require('fs');

function buildFullPatch() {
    // latest nodes with the good prompt
    const rawNodes = fs.readFileSync('patched_ai_workflow_p.json', 'utf8');
    // latest conns with the tools wired
    const rawConns = fs.readFileSync('conns_patched.json', 'utf8');

    const escNodes = rawNodes.replace(/'/g, "''");
    const escConns = rawConns.replace(/'/g, "''");

    const sql = `UPDATE workflow_entity \nSET nodes = '${escNodes}', \nconnections = '${escConns}' \nWHERE id = 'scpZdPe5Cp4MG98G';`;
    
    fs.writeFileSync('update_wf5.sql', sql);
    console.log("update_wf5.sql created.");
}
buildFullPatch();
