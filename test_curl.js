const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' }).then(async () => {
    // Execute identical failing payload
    const payload = JSON.stringify({
        batches: '["Planta Madre NP/1/2025", "Planta madre NP/2/2025", "Planta Madre RHC/1/2026"]',
        inputs: '[{"nombre": "Alga a mic", "cantidad": 8}]',
        water_liters: "2",
        event_type: "Nutricion",
        raw_description: "Aplicación simulada de 8ml de Alga a mic"
    });
    
    // Using --max-time 15 so it doesn't hang FOREVER
    const curlCmd = `curl --max-time 15 -s -v -X POST http://127.0.0.1:5006/bot-agronomico -H "Content-Type: application/json" -d '${payload}'`;
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
