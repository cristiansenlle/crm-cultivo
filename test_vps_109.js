const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    console.log("Connecting to WebApp Node (109.199.99.126) for Test...");
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
    
    // Verificamos qué código tiene bot_agronomy_server
    const code = await ssh.execCommand('grep "success: true" /opt/crm-cannabis/bot_agronomy_server.js');
    console.log("== HAS NEW CODE? ==", code.stdout ? "YES" : "NO");
    
    const curlCmd = `curl -s -X POST http://127.0.0.1:5006/bot-agronomico -H 'Content-Type: application/json' -d '{"batches":["Planta Madre NP/1/2025","Planta Madre NP/2/2025"],"inputs":"[{\\"name\\":\\"Top Vege\\",\\"qty\\":6}]","water_liters":2,"event_type":"Nutricion","raw_description":"Test Local"}'`;
    const testResult = await ssh.execCommand(curlCmd);
    console.log("== WEBHOOK RESPONSE ==");
    console.log(testResult.stdout);
    
    if(testResult.stderr) console.error("ERR:", testResult.stderr);
    
    ssh.dispose();
}
run().catch(console.error);
