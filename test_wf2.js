const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('n8n-crm-cannabis-FINAL-V16-OPENROUTER.json', 'utf-8'));
let node = wf.nodes.find(n => n.name === 'cargar_telemetria');

// Change to specifyBody
node.parameters.sendBody = true;
node.parameters.specifyBody = 'json';
node.parameters.jsonBody = `={
  "batch_id": "{sala_o_lote}",
  "room_id": "{sala_o_lote}",
  "temperature_c": {temperatura},
  "humidity_percent": {humedad},
  "vpd_kpa": {vpd},
  "sensor_id": {{ '{sensor_id}' === 'PROMEDIO_GENERAL' ? null : '{sensor_id}' }}
}`;

// Add sensor_id to placeholders
node.parameters.placeholderDefinitions.values.push({
    "name": "sensor_id",
    "description": "El ID del sensor. Debes preguntar siempre.",
    "type": "string"
});

delete node.parameters.parametersBody; // remove parametersBody

fs.writeFileSync('test_jsonbody_wf.json', JSON.stringify(wf, null, 2), 'utf-8');
console.log('test_jsonbody_wf.json created');
