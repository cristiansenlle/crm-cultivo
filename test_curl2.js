const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' }).then(async () => {
    console.log('Uploading hotfixed middleware...');
    await ssh.putFile('bot_agronomy_server.js', '/opt/crm-cannabis/bot_agronomy_server.js');
    console.log('Restarting PM2 Service...');
    await ssh.execCommand('pm2 restart bot_agronomy_server');
    console.log('Server online. Executing synthetic POST simulation...');
    
    // Wait for PM2 to bring the process up fully
    await new Promise(r => setTimeout(r, 2000));
    
    // Exec CURL
    const payload = JSON.stringify({
        batches: '["Planta Madre NP/1/2025", "Planta madre NP/2/2025", "Planta Madre RHC/1/2026"]',
        inputs: '[{"nombre": "Alga a mic", "cantidad": 8}]',
        water_liters: "2",
        event_type: "Nutricion",
        raw_description: "Aplicación simulada de 8ml de Alga a mic"
    });
    
    const curlCmd = `curl -s -v -X POST http://127.0.0.1:5006/bot-agronomico -H "Content-Type: application/json" -d '${payload}'`;
    console.log('Executing:', curlCmd);
    
    try {
        const curl = await ssh.execCommand(curlCmd);
        console.log('--- CURL OUT ---');
        console.log(curl.stdout);
        console.log('--- CURL ERR ---');
        console.log(curl.stderr);
    } catch(e) {
        console.error('CURL FAILED:', e);
    }
    
    ssh.dispose();
}).catch(console.error);
