const fs = require('fs');

try {
    const data = fs.readFileSync('workflow_nodes.json', 'utf16le');
    // Remove the header from remote_exec output if present
    const jsonStart = data.indexOf('[');
    if (jsonStart === -1) {
        console.log('No JSON found');
        process.exit(1);
    }
    const nodes = JSON.parse(data.substring(jsonStart));
    const toolNode = nodes.find(n => n.name === 'cargar_telemetria_sala');
    console.log(JSON.stringify(toolNode, null, 2));
} catch (e) {
    console.error(e);
}
