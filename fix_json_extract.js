const fs = require('fs');
let j = JSON.parse(fs.readFileSync('n8n-crm-cannabis-workflow.json', 'utf8'));

let extractNode = j.nodes.find(n => n.name === 'Extract TM Data');
if (extractNode) {
    extractNode.parameters.values.number = [
        { name: "temp", value: "={{parseFloat($json.body.body.split(' ')[1])}}" },
        { name: "humidity", value: "={{parseFloat($json.body.body.split(' ')[2])}}" },
        { name: "vpd", value: "={{ parseFloat((0.61078 * Math.exp((17.27 * parseFloat($json.body.body.split(' ')[1])) / (parseFloat($json.body.body.split(' ')[1]) + 237.3)) * (1 - parseFloat($json.body.body.split(' ')[2]) / 100)).toFixed(2)) }}" }
    ];
    extractNode.parameters.values.string = [
        { name: "room", value: "={{$json.body.body.split(' ')[3] || ''}}" }
    ];
}

fs.writeFileSync('n8n-crm-cannabis-workflow.json', JSON.stringify(j, null, 2));
console.log('Fixed extract json nodes to top level body.body');
