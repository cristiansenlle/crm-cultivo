const fs = require('fs');
let j = JSON.parse(fs.readFileSync('n8n-crm-cannabis-workflow.json', 'utf8'));

// 1. Verificar si ya existe un nodo de PG Select
let pgSelect = j.nodes.find(n => n.name === 'PG Select Telemetry');
if (!pgSelect) {
    // Clonar las credenciales del PG Insert para usarlas aquí
    let pgInsert = j.nodes.find(n => n.name === 'PG Insert WA TM');
    let creds = pgInsert ? pgInsert.credentials : { "postgres": { "id": "", "name": "Postgres account 3" } };
    
    pgSelect = {
        "parameters": {
            "operation": "executeQuery",
            "query": "SELECT temperature_c AS temp, humidity_percent AS hum, vpd_kpa AS vpd, created_at FROM daily_telemetry WHERE batch_id = '{{$json.query.roomId || \"sala1\"}}' ORDER BY created_at DESC LIMIT 1;"
        },
        "id": "pg-select-telemetry-123",
        "name": "PG Select Telemetry",
        "type": "n8n-nodes-base.postgres",
        "typeVersion": 2.2,
        "position": [ 300, 1400 ],
        "credentials": creds
    };
    j.nodes.push(pgSelect);
}

// 2. Conectar Webhook Get Telemetry -> PG Select Telemetry
if (!j.connections['Webhook Get Telemetry (WhatsApp)']) {
    j.connections['Webhook Get Telemetry (WhatsApp)'] = { "main": [ [] ] };
}
j.connections['Webhook Get Telemetry (WhatsApp)'].main[0] = [
    {
        "node": "PG Select Telemetry",
        "type": "main",
        "index": 0
    }
];

fs.writeFileSync('n8n-crm-cannabis-workflow.json', JSON.stringify(j, null, 2));
console.log('n8n Workflow updated with PG Select for Dashboard GET Telemetry');
