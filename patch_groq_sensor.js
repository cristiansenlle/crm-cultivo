const fs = require('fs');
const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    let wf = JSON.parse(fs.readFileSync('pulled_wf.json', 'utf8'));

    wf.nodes.forEach(n => {
        if (n.name === 'cargar_telemetria_groq') {
           n.parameters.placeholderDefinitions.values.forEach(v => {
               if(v.name === 'sensor_id') {
                   v.description = "UUID del sensor especifico (OBLIGATORIO). Debes obtenerlo antes haciendo call a consultar_sensores_groq";
               }
           });
        }
        
        // Anti Alucinación
        if (n.type.includes('Groq') && n.parameters?.options?.systemMessage) {
            let sys = n.parameters.options.systemMessage;
             sys += "\n\n⚠️ REGLA ESTRICTA TELEMETRÍA: SÍ PUEDES y DEBES distinguir entre sensores individuales. Nunca digas que el sistema no distingue sensores.";
             n.parameters.options.systemMessage = sys;
        }
    });

    fs.writeFileSync('patched_wf_tele.json', JSON.stringify(wf, null, 2));

    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
    await ssh.putFile('patched_wf_tele.json', '/root/n8n-crm-FINAL-MULTI-SENSOR.json');
    console.log("Subido a /root/n8n-crm-FINAL-MULTI-SENSOR.json");
    
    await ssh.execCommand('n8n import:workflow --input=/root/n8n-crm-FINAL-MULTI-SENSOR.json');
    console.log("Workflow N8N regenerado.");
    
    ssh.dispose();
}
run();
