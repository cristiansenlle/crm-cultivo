const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('pulled_wf.json', 'utf8'));

let modified = false;

wf.nodes.forEach(n => {
    // Parchear cualquier nodo cuyo nombre tenga "telemetria"
    if (n.name.includes('telemetria')) {
        console.log("Found:", n.name, n.type);
        
        // n8n-nodes-base.httpRequest (enviando JSON)
        if (n.type.includes('httpRequest') || n.type.includes('HttpRequest')) {
            // Check si los "bodyParameters.parameters" existen
            if (n.parameters && n.parameters.options && n.parameters.options.bodyArgument) {
                // If the user uses visual parameters
            }
            if (n.parameters && n.parameters.bodyParameters && n.parameters.bodyParameters.parameters) {
                let hasSensor = n.parameters.bodyParameters.parameters.find(p => p.name === 'sensor_id');
                if (!hasSensor) {
                    n.parameters.bodyParameters.parameters.push({
                        name: 'sensor_id',
                        value: '={{$json.sensor_id || $json.body.sensor_id}}'
                    });
                    modified = true;
                    console.log("Added sensor_id to Body Parameters of", n.name);
                }
            } else if (n.parameters && n.parameters.sendBody && n.parameters.specifyBody === 'json') {
                try {
                    let bd = JSON.parse(n.parameters.body);
                    if (bd.temperature_c && !bd.sensor_id) {
                        bd.sensor_id = "={{$json.sensor_id || $sensor_id}}";
                        n.parameters.body = JSON.stringify(bd, null, 2);
                        modified = true;
                        console.log("Added sensor_id to raw JSON Body of", n.name);
                    }
                } catch(e) {}
            }
        }
        
        // Si ES un Tool Node (n8n-nodes-base.toolHttpRequest o n8n-nodes-base.tool)
        // O si es la defincion de la funcion para OpenAI/Groq
        if (n.parameters && n.parameters.toolDescription) {
            n.parameters.toolDescription = n.parameters.toolDescription.replace(/por sala o por lote/i, 'obligatoriamente asociando a un sensor_id consultado previamente');
            modified = true;
        }
        if (n.parameters && n.parameters.schema) {
            let schemaJsonStr = n.parameters.schema;
            try {
                let sch = JSON.parse(schemaJsonStr);
                if (sch.properties && (!sch.properties.sensor_id)) {
                    sch.properties.sensor_id = {
                        type: "string",
                        description: "UUID del sensor especifico (usar consultar_sensores_groq previamente para obtenerlo)"
                    };
                    if (sch.required) schemaJsonStr = JSON.stringify(sch, null, 2);
                    n.parameters.schema = JSON.stringify(sch, null, 2);
                    modified = true;
                    console.log("Schema arreglado en", n.name);
                }
            } catch(e) {}
        }
    }
});

if (modified) {
    fs.writeFileSync('patched_telemetry_schema.json', JSON.stringify(wf, null, 2));
    console.log("Done.");
} else {
    console.log("Nothing to mod.");
}
