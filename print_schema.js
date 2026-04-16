const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('pulled_wf.json', 'utf8'));

wf.nodes.forEach(n => {
    if (n.name === 'cargar_telemetria_groq') {
       console.log("SCHEMA:", n.parameters.options.schema);
    }
});
