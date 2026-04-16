const fs = require('fs');

function patchTelemetry() {
    const nodes = JSON.parse(fs.readFileSync('patched_ai_workflow.json', 'utf8'));
    
    // Find the telemetry tools
    const tool1 = nodes.find(n => n.name === 'cargar_telemetria');
    const tool2 = nodes.find(n => n.name === 'cargar_telemetria_groq');

    if (tool1) {
        tool1.parameters.parametersBody.values.push({
            name: "room_id",
            valueProvider: "fieldValue",
            value: "{sala_o_lote}"
        });
    }

    if (tool2) {
        tool2.parameters.parametersBody.values.push({
            name: "room_id",
            valueProvider: "fieldValue",
            value: "{sala_o_lote}"
        });
    }

    // Save it back to same file so we can recreate the complete SQL
    fs.writeFileSync('patched_ai_workflow2.json', JSON.stringify(nodes, null, 2));

    const conn = JSON.parse(fs.readFileSync('live_connections.json', 'utf8'));

    // Re-build SQL
    const escNodes = JSON.stringify(nodes).replace(/'/g, "''");
    const escConn = JSON.stringify(conn).replace(/'/g, "''");

    const sql = `UPDATE workflow_entity SET nodes = '${escNodes}', connections = '${escConn}' WHERE id = 'scpZdPe5Cp4MG98G';`;
    fs.writeFileSync('update_wf2.sql', sql);
    console.log('Generated update_wf2.sql fixing telemetry sync');
}
patchTelemetry();
