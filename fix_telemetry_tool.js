const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('pulled_wf.json', 'utf8'));

let modified = false;

wf.nodes.forEach(n => {
    // Modify OpenAI / Groq nodes tools properties
    if (n.parameters && n.parameters.options && n.parameters.options.systemMessage) {
        let msg = n.parameters.options.systemMessage;
        if (msg.includes('telemetría por sala')) {
            msg = msg.replace(/solo registra la telemetría por sala o por lote/g, 'registra telemetría por sensor_id a través del tool cargar_telemetria_groq');
            n.parameters.options.systemMessage = msg;
            modified = true;
        }
    }

    if (n.parameters && n.parameters.tools) {
        if (n.parameters.tools.tools) {
            n.parameters.tools.tools.forEach(tool => {
                if (tool.name === 'cargar_telemetria_groq' || tool.name === 'cargar_telemetria') {
                    if (tool.description) {
                         tool.description = "Registra telemetria. REQUIERE batch_id, room_id y OBLIGATORIAMENTE un sensor_id (uuid) extraido de consultar_sensores_groq.";
                    }
                    if (tool.parameters) {
                        try {
                            const params = typeof tool.parameters === 'string' ? JSON.parse(tool.parameters) : tool.parameters;
                            if (!params.properties.sensor_id) {
                                params.properties.sensor_id = {
                                    type: "string",
                                    description: "UUID del sensor especifico consultado en consultar_sensores_groq"
                                };
                                params.required.push("sensor_id");
                                tool.parameters = JSON.stringify(params, null, 2);
                                modified = true;
                                console.log("Añadida prop sensor_id al tool", tool.name);
                            }
                        } catch(e) {}
                    }
                }
            });
        }
    }
});

// Update HTTP Node "cargar_telemetria_groq"
wf.nodes.forEach(n => {
   if (n.name === 'cargar_telemetria_groq' || n.name === 'cargar_telemetria') {
       if (n.parameters && n.parameters.options && typeof n.parameters.options.bodyArgument === 'string') {
          console.log("OLD HTTP payload:", n.parameters.options.bodyArgument);
       }
       if (n.parameters && n.parameters.bodyParameters) {
            if (n.parameters.bodyParameters.parameters) {
                let hasSensor = n.parameters.bodyParameters.parameters.find(p => p.name === 'sensor_id');
                if (!hasSensor) {
                    n.parameters.bodyParameters.parameters.push({
                        name: 'sensor_id',
                        value: '={{$json.tool.properties.sensor_id}}'
                    });
                     modified = true;
                     console.log("Add sensor_id to body parameter of HTTP node", n.name);
                }
            }
       } else if (n.parameters && n.parameters.sendBody) {
             console.log("Uses sendBody. Method:", n.parameters.method);
             // if it's raw we check
             if (n.parameters.specifyBody === 'json') {
                 try {
                     let bd = JSON.parse(n.parameters.body);
                     if (!bd.sensor_id) {
                        bd.sensor_id = "={{$json.tool.properties.sensor_id}}";
                        n.parameters.body = JSON.stringify(bd, null, 2);
                        modified = true;
                        console.log("Añadido sensor_id al body de", n.name);
                     }
                 } catch(e){}
             }
       }
   }
});

fs.writeFileSync('patched_wf_telemetry.json', JSON.stringify(wf, null, 2));
console.log("Archivo parcheado y guardado en patched_wf_telemetry.json. Modified:", modified);
