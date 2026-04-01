const { NodeSSH } = require('node-ssh');
const fs = require('fs');

const ssh = new NodeSSH();
ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' }).then(async () => {
    let code = await ssh.execCommand('cat /root/crm-cultivo/bot_agronomy_server.js');
    code = code.stdout;
    
    // Patch fuzzyMatch to print EXACTLY what is undefined
    const newFuzzy = `function fuzzyMatch(lookup, targetList) {
    if (lookup === undefined) { console.error('LOOKUP IS UNDEFINED'); return null; }
    
    const normalize = str => {
        if(str === undefined) {
            console.error('STR IS UNDEFINED DURING NORMALIZE!');
            return '';
        }
        return String(str).toLowerCase().replace(/[^a-z0-9áéíóúñ]/g, ' ').replace(/\\s+/g, ' ').trim();
    };
    
    const lLower = normalize(lookup);
    let bestMatch = null;
    let highestScore = 0;
    
    for (let i = 0; i < targetList.length; i++) {
        const item = targetList[i];
        if (item.name === undefined) {
            console.error('ITEM.NAME IS UNDEFINED AT INDEX', i, 'ITEM:', JSON.stringify(item));
            continue;
        }
        const iLower = normalize(item.name);
        if (lLower === iLower) return item;
        
        let score = 0;
        const words = lLower.split(' ');
        for(let w of words) {
            if(w.length > 2 && iLower.includes(w)) score++;
        }
        if (score > highestScore) {
            highestScore = score;
            bestMatch = item;
        }
    }
    return highestScore >= 1 ? bestMatch : null;
}`;

    code = code.replace(/function fuzzyMatch[\s\S]*?return highestScore >= 1 \? bestMatch : null;\n}/m, newFuzzy);
    
    fs.writeFileSync('server_trace.js', code);
    await ssh.putFile('server_trace.js', '/root/crm-cultivo/bot_agronomy_server.js');
    await ssh.execCommand('pm2 restart bot_agronomy_server');
    console.log('Server restarted with safe fuzzyMatch.');
    
    // Wait for PM2
    await new Promise(r => setTimeout(r, 2000));
    
    // Exec CURL
    const payload = JSON.stringify({
        batches: '["Planta Madre NP/1/2025"]',
        inputs: '[{"nombre": "Alga a mic", "cantidad": 8}]',
        event_type: 'Nutricion'
    });
    const curl = await ssh.execCommand(`curl -s -v -X POST http://127.0.0.1:5006/bot-agronomico -H "Content-Type: application/json" -d '${payload}'`);
    console.log('--- CURL OUT ---');
    console.log(curl.stdout);
    console.log('--- CURL ERR ---');
    console.log(curl.stderr);
    
    const errs = await ssh.execCommand('tail -n 15 /root/.pm2/logs/bot-agronomy-server-error.log');
    console.log('--- ERRORS ---');
    console.log(errs.stdout);
    
    const outs = await ssh.execCommand('tail -n 15 /root/.pm2/logs/bot-agronomy-server-out.log');
    console.log('--- OUTS ---');
    console.log(outs.stdout);
    ssh.dispose();
}).catch(console.error);
