const fs = require('fs');
let j = JSON.parse(fs.readFileSync('n8n-crm-cannabis-workflow.json', 'utf8'));

let formatEnv = j.nodes.find(n => n.name === 'Format Env Response');
if (formatEnv) {
    formatEnv.parameters.values.string[0].value = "={{ '✅ Telemetría registrada: Temperatura ' + $('Extract TM Data').item.json.temp + '°C / Humedad ' + $('Extract TM Data').item.json.humidity + '% / VPD ' + $('Extract TM Data').item.json.vpd + ' kPa en lote/sala ' + $('Extract TM Data').item.json.room }}";
}

fs.writeFileSync('n8n-crm-cannabis-workflow.json', JSON.stringify(j, null, 2));
console.log('Fixed expression refs for Format Env Response node!');
