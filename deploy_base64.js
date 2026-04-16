const fs = require('fs');
const cp = require('child_process');

try {
    console.log("Generando Base64...");
    const content = fs.readFileSync('remote_bot_agronomy_server.js');
    const base64str = content.toString('base64');
    
    console.log("Inyectando e iniciando en Contabo...");
    const cmd = `ssh root@144.126.216.51 "echo ${base64str} | base64 -d > /opt/crm-cannabis/bot_agronomy_server.js && pm2 restart bot_agro"`;
    
    // Lo configuro asincrono o con buffer grande por si acaso
    const out = cp.execSync(cmd, { stdio: 'pipe' });
    console.log("RES:", out.toString());
    
    console.log("Corriendo test HTTP interno...");
    const test = cp.execSync(`ssh root@144.126.216.51 "curl -s -X POST http://127.0.0.1:5006/bot-agronomico -H 'Content-Type: application/json' -d '{\\"batches\\":[\\"Planta Madre NP/1/2025\\",\\"Planta Madre NP/2/2025\\"],\\"inputs\\":\\"[{\\\\\\"name\\\\\\":\\\\\\"Top Vege\\\\\\",\\\\\\"qty\\\\\\":6}]\\",\\"water_liters\\":2,\\\"event_type\\\":\\"Nutricion\\",\\"raw_description\\\":\\"Test Costos\\"}'"`);
    console.log("TEST RES:", test.toString());

    console.log("SUCCESS COMPLETADO");
} catch(e) {
    console.error("ERR:", e.message);
    if(e.stderr) console.error("STDERR:", e.stderr.toString());
}
