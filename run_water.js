const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
    console.log("Connect to 144 n8n...");
    await ssh.connect({ host: '144.126.216.51', username: 'root', password: 'SWbCPD6AdBac' });
    await ssh.putFile('water_patcher.py', '/root/water_patcher.py');
    const res = await ssh.execCommand('docker cp /root/water_patcher.py n8n:/home/node/water_patcher.py && docker exec n8n python3 /home/node/water_patcher.py && docker restart n8n');
    console.log(res.stdout);
    if(res.stderr) console.error(res.stderr);
    
    console.log("Connect to 109 Backend...");
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
    
    // Subo de nuevo nuestro agronomico arreglado! (que no subió antes o se borró/cacheó)
    await ssh.putFile('remote_bot_agronomy_server.js', '/opt/crm-cannabis/bot_agronomy_server.js');
    console.log("Hard resetting PM2 Bot en 109...");
    await ssh.execCommand('pm2 delete bot_agronomy_server || true');
    await ssh.execCommand('pm2 start /opt/crm-cannabis/bot_agronomy_server.js --name bot_agronomy_server');
    await ssh.execCommand('pm2 save');
    
    console.log("TESTING WEBHOOK AGAIN (without water):");
    const curl = `curl -s -X POST http://127.0.0.1:5006/bot-agronomico -H 'Content-Type: application/json' -d '{"batches":["Planta Madre NP/1/2025","Planta Madre NP/2/2025"],"inputs":"[{\\"name\\":\\"Top Vege\\",\\"qty\\":6}]","event_type":"Nutricion","raw_description":"Test Local Agua Off"}'`;
    const res2 = await ssh.execCommand(curl);
    console.log(res2.stdout);
    
    ssh.dispose();
}
run().catch(console.error);
