const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('n8n-crm-cannabis-FINAL-V16-OPENROUTER.json', 'utf-8'));
let node = wf.nodes.find(n => n.name === 'cargar_telemetria');

// Change to specifyBody
node.parameters.sendBody = true;
node.parameters.specifyBody = 'json';
node.parameters.jsonBody = '={{ {\n  batch_id: $parameter.sala_o_lote,\n  room_id: $parameter.sala_o_lote,\n  temperature_c: $parameter.temperatura,\n  humidity_percent: $parameter.humedad,\n  vpd_kpa: $parameter.vpd,\n  sensor_id: $parameter.sensor_id === "PROMEDIO_GENERAL" ? null : $parameter.sensor_id\n} }}'; // N8N expression string format

// Add sensor_id to placeholders
node.parameters.placeholderDefinitions.values.push({
    "name": "sensor_id",
    "description": "El ID del sensor. Debes usar consultar_sensores para saber quÃ© sensores hay y PREGUNTAR al usuario. Si el usuario insiste que es un PROMEDIO GENERAL, invoca la herramienta pasando explÃ­citamente el texto 'PROMEDIO_GENERAL'.",
    "type": "string"
});

fs.writeFileSync('test_wf.json', JSON.stringify(wf, null, 2), 'utf-8');
console.log('test_wf.json created');
