const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' }).then(async () => {

    const payload = {
        "batches": "[\"Planta Madre NP/1/2025\",\"Planta madre NP/2/2025\",\"Planta Madre RHC/1/2026\"]",
        "inputs": "[{\"name\":\"Top Veg\",\"qty\":8},{\"name\":\"Barrier\",\"qty\":1}]",
        "water_liters": "2",
        "event_type": "Aplicacion",
        "raw_description": "Aplicación de 8 ml de Top Veg y 1 ml de Barrier en 2 litros de agua para los tres lotes activos en carpa 1."
    };

    const cmd = `curl -s -w "\\nHTTP_CODE:%{http_code}\\n" -X POST http://127.0.0.1:5006/bot-agronomico -H 'Content-Type: application/json' -d '${JSON.stringify(payload)}'`;
    console.log("Running:", cmd.substring(0, 100) + '...');
    
    const r = await ssh.execCommand(cmd);
    console.log("Response:", r.stdout);

    ssh.dispose();
}).catch(e => console.error(e));
