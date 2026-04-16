const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
    console.log("Connect to 109 Backend...");
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
    
    // Subo el bot
    await ssh.putFile('remote_bot_agronomy_server.js', '/opt/crm-cannabis/bot_agronomy_server.js');
    console.log("Hard resetting PM2 Bot en 109...");
    await ssh.execCommand('pm2 delete bot_agronomy_server || true');
    // Tambien voy a borrar el nombre "bot_agro" si quedó huerfano hoy más temprano
    await ssh.execCommand('pm2 delete bot_agro || true');
    console.log("Reiniciando...");
    await ssh.execCommand('pm2 start /opt/crm-cannabis/bot_agronomy_server.js --name bot_agronomy_server');
    await ssh.execCommand('pm2 save');
    
    console.log("TESTING WEBHOOK AGAINST PROD (without water to test resilience):");
    const curl = `curl -s -X POST http://127.0.0.1:5006/bot-agronomico -H 'Content-Type: application/json' -d '{"batches":["Planta Madre NP/1/2025","Planta Madre NP/2/2025"],"inputs":"[{\\"name\\":\\"Top Vege\\",\\"qty\\":6}]","event_type":"Nutricion","raw_description":"Test Local"}'`;
    const res2 = await ssh.execCommand(curl);
    console.log(">> WEBHOOK RES:");
    console.log(res2.stdout);
    if (res2.stderr) console.error("stderr:", res2.stderr);
    
    ssh.dispose();
}
run().catch(console.error);
