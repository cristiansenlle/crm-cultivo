const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    console.log("Connecting to Contabo N8N Node (144.126.216.51)...");
    await ssh.connect({ host: '144.126.216.51', username: 'root', password: 'SWbCPD6AdBac' });
    
    console.log("Applying SQLite Patcher to Revert IP to 109.199.99.126...");
    await ssh.putFile('vps_n8n_patcher.py', '/root/vps_n8n_patcher.py');
    const res = await ssh.execCommand('docker cp /root/vps_n8n_patcher.py n8n:/home/node/vps_n8n_patcher.py && docker exec n8n python3 /home/node/vps_n8n_patcher.py && docker restart n8n');
    console.log(res.stdout);
    if(res.stderr) console.error(res.stderr);
    
    console.log("Connecting to WebApp Node (109.199.99.126) for Test...");
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
    
    const curlCmd = `curl -s -X POST http://127.0.0.1:5006/bot-agronomico -H 'Content-Type: application/json' -d '{"batches":["Planta Madre NP/1/2025"],"inputs":"[{\\"name\\":\\"Top Vege\\",\\"qty\\":6}]","water_liters":2,"event_type":"Nutricion","raw_description":"Test Local"}'`;
    const testResult = await ssh.execCommand(curlCmd);
    console.log("== WEBHOOK RESPONSE ==");
    console.log(testResult.stdout);
    
    ssh.dispose();
    console.log("DONE");
}
run().catch(console.error);
