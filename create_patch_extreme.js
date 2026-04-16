const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('active_workflow_final_patched.json', 'utf8'))[0];
const ROOM_UUID = "2de32401-cb5f-4bbd-9b67-464aa703679c";

let nodes;
if (wf.nodes && wf.nodes.type === 'Buffer') {
    nodes = JSON.parse(Buffer.from(wf.nodes.data).toString('utf8'));
} else {
    nodes = wf.nodes;
}

nodes.forEach(node => {
    if (node.name.includes('cargar_telemetria')) {
        const params = node.parameters;
        params.specifyBody = 'keypair'; // Back to keypair for simplicity in this extreme test
        params.parametersBody = {
            "values": [
                { "name": "batch_id", "valueProvider": "fieldValue", "value": ROOM_UUID },
                { "name": "room_id", "valueProvider": "fieldValue", "value": ROOM_UUID },
                { "name": "temperature_c", "valueProvider": "fieldValue", "value": "{temperatura}" },
                { "name": "humidity_percent", "valueProvider": "fieldValue", "value": "{humedad}" }
            ]
        };
        console.log(`HARDCODED UUID in node: ${node.name}`);
    }
});

const hex = Buffer.from(JSON.stringify(nodes), 'utf8').toString('hex');
const sql = `UPDATE workflow_entity SET nodes = x'${hex}', active = 1 WHERE id = 'scpZdPe5Cp4MG98G';`;
fs.writeFileSync('patch_extreme_hardcode.sql', sql);
console.log('Extreme Hardcode Patch created.');
