const fs = require('fs');
let j = JSON.parse(fs.readFileSync('n8n-crm-cannabis-workflow.json', 'utf8'));

let waPgInsert = j.nodes.find(n => n.name === 'PG Insert WA TM');
if (waPgInsert) {
    waPgInsert.parameters.query = "=INSERT INTO daily_telemetry (batch_id, temperature_c, humidity_percent, vpd_kpa, created_at) VALUES ('{{$json.room}}', {{$json.temp}}, {{$json.humidity}}, {{$json.vpd}}, NOW()) RETURNING id;";
}

let extractNode = j.nodes.find(n => n.name === 'Extract TM Data');
if (extractNode) {
    let vpdNode = extractNode.parameters.values.number.find(n => n.name === 'vpd');
    if (vpdNode) {
        vpdNode.value = "={{ parseFloat((0.61078 * Math.exp((17.27 * parseFloat($json.body.body.split(' ')[1])) / (parseFloat($json.body.body.split(' ')[1]) + 237.3)) * (1 - parseFloat($json.body.body.split(' ')[2]) / 100)).toFixed(2)) }}";
    }
}

let formatEnv = j.nodes.find(n => n.name === 'Format Env Response');
if (formatEnv) {
    formatEnv.parameters.values.string[0].value = "={{ '✅ Telemetría registrada: Temperatura ' + $json.temp + '°C / Humedad ' + $json.humidity + '% / VPD ' + $json.vpd + ' kPa en lote/sala ' + $json.room }}";
}

fs.writeFileSync('n8n-crm-cannabis-workflow.json', JSON.stringify(j, null, 2));
console.log('JSON fixed!');
