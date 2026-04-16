const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    console.log("Connecting...");
    await ssh.connect({
        host: '144.126.216.51',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI', // using working VPS pwd 
        readyTimeout: 10000
    });
    
    console.log("Connected. Uploading script...");
    await ssh.putFile('remote_bot_agronomy_server.js', '/opt/crm-cannabis/bot_agronomy_server.js');
    console.log("Uploaded. Restarting pm2...");
    
    const result = await ssh.execCommand('pm2 restart bot_agro', { cwd: '/opt/crm-cannabis' });
    console.log("PM2 Output:", result.stdout);
    
    console.log("Test local...");
    const curlCmd = `curl -s -X POST http://127.0.0.1:5006/bot-agronomico -H 'Content-Type: application/json' -d '{"batches":["Planta Madre NP/1/2025", "Planta Madre NP/2/2025"],"inputs":"[{\\"name\\":\\"Top Vege\\",\\"qty\\":6}]","water_liters":2,"event_type":"Nutricion","raw_description":"Test Local"}'`;
    
    const testResult = await ssh.execCommand(curlCmd);
    console.log("Test Webhook Output:", testResult.stdout);
    
    ssh.dispose();
}
run().catch(console.error);
